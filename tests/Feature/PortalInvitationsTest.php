<?php
namespace Tests\Feature;

use App\Services\PortalInvitationService;
use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PortalInvitationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Workflow tests share an IP; production throttling remains enabled on every route.
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
    }

    private function admin(): array
    {
        $id = DB::table('admins')->insertGetId(['name' => 'Admin', 'email' => 'inviter@example.com', 'role' => 'admin', 'password_hash' => Hash::make('password')]);
        return ['Authorization' => 'Bearer '.AdminToken::make(DB::table('admins')->find($id))];
    }

    public function test_client_requires_name_or_company_and_company_only_uses_company_display_name(): void
    {
        Mail::fake();
        $admin = $this->admin();
        $this->postJson('/api/client-admin/clients', ['email' => 'company@example.com', 'name' => '  ', 'company' => '', 'portal_active' => true], $admin)->assertUnprocessable()->assertJsonValidationErrors(['name', 'company']);
        $id = $this->postJson('/api/client-admin/clients', ['email' => 'company@example.com', 'company' => 'Company Only Ltd', 'portal_active' => true], $admin)->assertOk()->json('id');
        $this->assertDatabaseHas('users', ['id' => $id, 'name' => 'Company Only Ltd', 'company' => 'Company Only Ltd']);
        $this->assertDatabaseHas('crm_contacts', ['email' => 'company@example.com', 'name' => 'Company Only Ltd']);
        $this->postJson('/api/client-admin/clients/'.$id, ['email' => 'company@example.com', 'name' => 'Named Client', 'company' => null, 'portal_active' => true], $admin)->assertOk();
        $this->assertDatabaseHas('users', ['id' => $id, 'name' => 'Named Client', 'company' => null]);
        $this->postJson('/api/client-admin/clients/'.$id, ['email' => 'company@example.com', 'name' => 'Named Client', 'company' => 'Company Ltd', 'portal_active' => true], $admin)->assertOk();
    }

    private function passwordless(): int
    {
        return DB::table('users')->insertGetId(['name' => 'Client', 'email' => 'client@example.com', 'password' => Hash::make('unguessable-generated-password'), 'portal_password_set' => false, 'portal_active' => true]);
    }

    private function secret(int $mailId): string
    {
        $payload = json_decode(Crypt::decryptString(DB::table('portal_invitation_mail')->where('id', $mailId)->value('encrypted_payload')), true);
        return explode('#invite=', $payload['url'])[1];
    }

    public function test_onboarding_links_existing_crm_without_overwriting_data_and_emails_invitation(): void
    {
        Mail::fake();
        $headers = $this->admin();
        $crm = DB::table('crm_contacts')->insertGetId(['email' => 'client@example.com', 'name' => 'Existing name', 'company' => 'Existing company', 'notes' => 'Private CRM notes']);
        $this->getJson('/api/client-admin/client-lookup?email=client@example.com', $headers)->assertOk()->assertJsonPath('suggestion.source', 'CRM contact')->assertJsonPath('suggestion.name', 'Existing name')->assertDontSee('Private CRM notes');
        $this->postJson('/api/client-admin/clients', ['email' => 'client@example.com', 'name' => 'Portal name', 'company' => 'Portal company', 'portal_active' => true], $headers)->assertOk()->assertJsonPath('delivery_status', 'sent');
        $this->assertDatabaseCount('crm_contacts', 1);
        $this->assertDatabaseHas('crm_contacts', ['id' => $crm, 'name' => 'Existing name', 'notes' => 'Private CRM notes']);
        $this->assertDatabaseHas('users', ['email' => 'client@example.com', 'crm_contact_id' => $crm, 'portal_password_set' => false]);
        $this->assertDatabaseHas('portal_invitation_mail', ['status' => 'sent', 'encrypted_payload' => null]);
        $this->assertDatabaseHas('crm_activities', ['contact_id' => $crm, 'subject' => 'Client portal invitation queued']);
        $this->postJson('/api/client-admin/clients', ['email' => 'client@example.com', 'name' => 'Duplicate', 'portal_active' => true], $headers)->assertUnprocessable();
        $this->getJson('/api/client-admin/clients', $headers)->assertOk()->assertJsonPath('clients.0.invitation_status', 'sent');
    }

    public function test_reusable_links_stop_working_after_password_is_set_and_other_sessions_are_revoked(): void
    {
        $id = $this->passwordless();
        $mail = app(PortalInvitationService::class)->queue($id);
        $secret = $this->secret($mail);
        $this->assertDatabaseHas('portal_invitations', ['token_hash' => hash('sha256', $secret)]);
        $this->assertNotSame($secret, DB::table('portal_invitation_mail')->value('encrypted_payload'));
        $a = $this->postJson('/api/portal/invitation/exchange', ['secret' => $secret])->assertOk()->json('token');
        $b = $this->postJson('/api/portal/invitation/exchange', ['secret' => $secret])->assertOk()->json('token');
        $this->postJson('/api/portal/account', ['name' => 'Client', 'password' => 'New-private-password-42', 'password_confirmation' => 'New-private-password-42'], ['Authorization' => 'Bearer '.$a])->assertOk();
        $this->postJson('/api/portal/invitation/exchange', ['secret' => $secret])->assertOk()->assertJsonPath('login_required', true)->assertJsonMissingPath('token');
        $this->getJson('/api/portal/overview', ['Authorization' => 'Bearer '.$b])->assertUnauthorized();
        $this->getJson('/api/portal/overview', ['Authorization' => 'Bearer '.$a])->assertOk()->assertJsonPath('user.portal_password_set', true);
        $this->postJson('/api/portal/login', ['email' => 'client@example.com', 'password' => 'New-private-password-42'])->assertOk();
        $this->postJson('/api/portal/account', ['name' => 'Client', 'password' => 'Another-password-42', 'password_confirmation' => 'Another-password-42'], ['Authorization' => 'Bearer '.$a])->assertUnprocessable();
        $this->assertDatabaseHas('portal_invitation_mail', ['id' => $mail, 'status' => 'cancelled', 'encrypted_payload' => null]);
    }

    public function test_rotation_expiry_revocation_and_deactivation_block_links(): void
    {
        $id = $this->passwordless(); $service = app(PortalInvitationService::class);
        $first = $this->secret($service->queue($id));
        $second = $this->secret($service->queue($id));
        $this->postJson('/api/portal/invitation/exchange', ['secret' => $first])->assertJsonPath('login_required', true);
        $this->postJson('/api/portal/invitation/exchange', ['secret' => $second])->assertJsonStructure(['token']);
        DB::table('portal_invitations')->whereNull('revoked_at')->update(['expires_at' => now()->subMinute()]);
        $this->postJson('/api/portal/invitation/exchange', ['secret' => $second])->assertJsonPath('login_required', true);
        $third = $this->secret($service->queue($id));
        DB::table('users')->where('id', $id)->update(['portal_active' => false]);
        $this->postJson('/api/portal/invitation/exchange', ['secret' => $third])->assertJsonPath('login_required', true);
        $this->postJson('/api/portal/invitation/exchange', ['secret' => str_repeat('0', 64)])->assertJsonPath('login_required', true);
    }

    public function test_failed_mail_is_retryable_and_never_reports_success(): void
    {
        $id = $this->passwordless(); $service = app(PortalInvitationService::class);
        $mail = $service->queue($id);
        Mail::shouldReceive('send')->once()->andThrow(new \RuntimeException('SMTP offline'));
        $this->assertSame('retry', $service->deliver($mail));
        $this->assertDatabaseHas('portal_invitation_mail', ['id' => $mail, 'status' => 'retry', 'attempts' => 1, 'sent_at' => null]);
        $this->assertNotNull(DB::table('portal_invitation_mail')->where('id', $mail)->value('encrypted_payload'));
    }

    public function test_invitation_mail_body_is_redacted_from_email_logs(): void
    {
        config(['mail.default' => 'array']);
        $id = $this->passwordless(); $service = app(PortalInvitationService::class);
        $mail = $service->queue($id); $secret = $this->secret($mail);
        $this->assertSame('sent', $service->deliver($mail));
        $log = DB::table('email_logs')->where('source', 'portal-invitation')->first();
        $this->assertNotNull($log);
        $this->assertNull($log->body_html);
        $this->assertStringNotContainsString($secret, $log->body_text);
    }

    public function test_clients_and_unassigned_staff_cannot_lookup_or_invite_other_clients(): void
    {
        $id = $this->passwordless();
        $service = app(PortalInvitationService::class);
        $secret = $this->secret($service->queue($id));
        $clientToken = $this->postJson('/api/portal/invitation/exchange', ['secret' => $secret])->json('token');
        $headers = ['Authorization' => 'Bearer '.$clientToken];
        $this->getJson('/api/client-admin/client-lookup?email=client@example.com', $headers)->assertForbidden();
        $this->postJson('/api/client-admin/clients/'.$id.'/invite', [], $headers)->assertForbidden();
        $staffId = DB::table('admins')->insertGetId(['name' => 'Unassigned staff', 'email' => 'staff@example.com', 'role' => 'staff', 'password_hash' => Hash::make('password')]);
        $staff = ['Authorization' => 'Bearer '.AdminToken::make(DB::table('admins')->find($staffId))];
        $this->postJson('/api/client-admin/clients/'.$id.'/invite', [], $staff)->assertForbidden();
        $this->getJson('/api/client-admin/client-lookup?email=client@example.com', $staff)->assertForbidden();
    }

    public function test_password_account_invitation_opens_login_without_creating_a_new_access_link(): void
    {
        $id = $this->passwordless();
        DB::table('users')->where('id', $id)->update(['portal_password_set' => true]);
        $mailId = app(PortalInvitationService::class)->queue($id);
        $payload = json_decode(Crypt::decryptString(DB::table('portal_invitation_mail')->where('id', $mailId)->value('encrypted_payload')), true);
        $this->assertFalse($payload['passwordless']);
        $this->assertSame(rtrim(config('app.url'), '/').'/portal', $payload['url']);
        $this->assertDatabaseCount('portal_invitations', 0);
    }

    public function test_admin_can_copy_reusable_encrypted_link_and_password_accounts_are_blocked(): void
    {
        $id = $this->passwordless(); $admin = $this->admin();
        $path = '/api/client-admin/clients/'.$id.'/copy-link';
        $response = $this->postJson($path, [], $admin)->assertOk();
        $url = $response->json('url');
        $secret = explode('#invite=', $url)[1];
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $this->postJson($path, [], $admin)->assertOk()->assertJsonPath('url', $url);
        $this->assertDatabaseCount('portal_invitations', 1);
        $this->assertNotSame($secret, DB::table('portal_invitations')->value('encrypted_secret'));
        $this->assertSame($secret, Crypt::decryptString(DB::table('portal_invitations')->value('encrypted_secret')));
        $token = $this->postJson('/api/portal/invitation/exchange', ['secret' => $secret])->assertOk()->json('token');
        $this->postJson($path, [], ['Authorization' => 'Bearer '.$token])->assertForbidden();
        $this->postJson('/api/portal/account', ['name' => 'Client', 'password' => 'Private-password-123', 'password_confirmation' => 'Private-password-123'], ['Authorization' => 'Bearer '.$token])->assertOk();
        $this->postJson($path, [], $admin)->assertUnprocessable();
        $this->assertNull(DB::table('portal_invitations')->value('encrypted_secret'));
        $this->postJson('/api/portal/invitation/exchange', ['secret' => $secret])->assertJsonPath('login_required', true);
    }

    public function test_copy_recovers_pending_legacy_link_without_rotating_it(): void
    {
        $id = $this->passwordless(); $service = app(PortalInvitationService::class);
        $mailId = $service->queue($id); $secret = $this->secret($mailId);
        DB::table('portal_invitations')->update(['encrypted_secret' => null]);
        $result = $service->copyLink($id);
        $this->assertStringEndsWith('#invite='.$secret, $result['url']);
        $this->assertFalse($result['created']);
        $this->assertDatabaseCount('portal_invitations', 1);
        $service->revoke($id);
        $replacement = $service->copyLink($id);
        $this->assertNotSame($result['url'], $replacement['url']);
        DB::table('users')->where('id', $id)->update(['portal_active' => false]);
        $this->postJson('/api/client-admin/clients/'.$id.'/copy-link', [], $this->admin())->assertUnprocessable();
    }
}
