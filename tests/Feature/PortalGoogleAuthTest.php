<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PortalGoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    private function configure(): void
    {
        DB::table('portal_auth_settings')->insert(['id' => 1, 'google_enabled' => true, 'google_client_id' => 'test.apps.googleusercontent.com', 'google_client_secret' => Crypt::encryptString('secret')]);
    }

    private function identity(bool $verified = true, string $email = 'client@gmail.com'): void
    {
        Http::swap(new \Illuminate\Http\Client\Factory());
        Http::fake(['oauth2.googleapis.com/token' => Http::response(['access_token' => 'provider-token']), 'openidconnect.googleapis.com/v1/userinfo' => Http::response(['sub' => 'google-subject-123', 'email' => $email, 'email_verified' => $verified])]);
    }

    private function googleCallback()
    {
        return $this->withSession(['portal_google' => ['state' => 'safe-state', 'expires' => time() + 600, 'verifier' => 'pkce-verifier']])->get('/auth/google/callback?state=safe-state&code=provider-code');
    }

    public function test_settings_are_admin_only_and_secret_is_encrypted_and_never_returned(): void
    {
        foreach (['admin', 'staff'] as $role) {
            $id = DB::table('admins')->insertGetId(['name' => $role, 'email' => $role.'@example.com', 'role' => $role, 'password_hash' => Hash::make('test-password')]);
            $headers[$role] = ['Authorization' => 'Bearer '.AdminToken::make(DB::table('admins')->find($id))];
        }
        $this->getJson('/api/client-admin/google-settings', $headers['staff'])->assertForbidden();
        $this->postJson('/api/client-admin/google-settings', ['enabled' => true, 'client_id' => 'test.apps.googleusercontent.com', 'client_secret' => 'very-private-secret'], $headers['admin'])->assertOk()->assertJsonPath('secret_configured', true)->assertDontSee('very-private-secret');
        $encrypted = DB::table('portal_auth_settings')->value('google_client_secret');
        $this->assertNotSame('very-private-secret', $encrypted);
        $this->assertSame('very-private-secret', Crypt::decryptString($encrypted));
        $this->postJson('/api/client-admin/google-settings', ['enabled' => false, 'client_id' => 'test.apps.googleusercontent.com', 'client_secret' => ''], $headers['admin'])->assertOk();
        $this->assertSame($encrypted, DB::table('portal_auth_settings')->value('google_client_secret'));
        $this->getJson('/api/portal/google-availability')->assertExactJson(['enabled' => false]);
    }

    public function test_google_flow_matches_existing_active_client_and_issues_single_use_handoff(): void
    {
        $this->configure(); $this->identity();
        $id = DB::table('users')->insertGetId(['name' => 'Client', 'email' => 'client@gmail.com', 'password' => Hash::make('client-password'), 'portal_active' => true]);
        $start = $this->get('/auth/google/start')->assertRedirect();
        $this->assertStringContainsString('code_challenge_method=S256', $start->headers->get('Location'));
        $this->googleCallback()->assertRedirect('/portal?google_complete=1');
        $this->assertDatabaseHas('users', ['id' => $id, 'google_subject' => 'google-subject-123']);
        $complete = $this->getJson('/auth/google/complete')->assertOk();
        $this->getJson('/api/portal/overview', ['Authorization' => 'Bearer '.$complete->json('token')])->assertOk();
        $this->getJson('/auth/google/complete')->assertUnauthorized();
        Http::assertSent(fn ($r) => $r->url() === 'https://oauth2.googleapis.com/token' && $r['code_verifier'] === 'pkce-verifier');
    }

    public function test_unknown_unverified_disabled_and_external_email_accounts_are_rejected(): void
    {
        $this->configure(); $this->identity();
        $this->googleCallback()->assertRedirect('/portal?google_error=no_account');
        $this->assertDatabaseCount('users', 0);
        $id = DB::table('users')->insertGetId(['name' => 'Client', 'email' => 'client@gmail.com', 'password' => Hash::make('client-password'), 'portal_active' => false]);
        $this->googleCallback()->assertRedirect('/portal?google_error=no_account');
        DB::table('users')->where('id', $id)->update(['portal_active' => true]);
        $this->identity(false);
        $this->googleCallback()->assertRedirect('/portal?google_error=unverified');
        DB::table('users')->where('id', $id)->update(['email' => 'client@example.com']);
        $this->identity(true, 'client@example.com');
        $this->googleCallback()->assertRedirect('/portal?google_error=no_account');
        $this->assertDatabaseCount('portal_sessions', 0);
    }

    public function test_missing_mismatched_and_expired_state_never_contact_google(): void
    {
        $this->configure(); Http::fake();
        $this->get('/auth/google/callback?state=invalid&code=x')->assertRedirect('/portal?google_error=expired');
        $this->withSession(['portal_google' => ['state' => 'expected', 'expires' => time()+600, 'verifier' => 'x']])->get('/auth/google/callback?state=wrong&code=x')->assertRedirect('/portal?google_error=expired');
        $this->withSession(['portal_google' => ['state' => 'expected', 'expires' => time()-10, 'verifier' => 'x']])->get('/auth/google/callback?state=expected&code=x')->assertRedirect('/portal?google_error=expired');
        Http::assertNothingSent();
    }
}

