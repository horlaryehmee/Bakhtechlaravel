<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CrmEmailProgramTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(string $role = 'admin'): void
    {
        $id = DB::table('admins')->insertGetId(['email' => $role.'@example.test', 'name' => ucfirst($role), 'password_hash' => bcrypt('secret'), 'role' => $role, 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($id)));
    }

    public function test_recurring_campaign_sends_to_subscribed_audience_once_per_cycle(): void
    {
        $this->signIn();
        Mail::fake();
        $subscribed = $this->postJson('/api/admin/crm/contacts', ['name' => 'Ada', 'email' => 'ada@example.test'])->assertOk()->json('contact.id');
        $unsubscribed = $this->postJson('/api/admin/crm/contacts', ['name' => 'No Mail', 'email' => 'no@example.test'])->assertOk()->json('contact.id');
        $this->putJson("/api/admin/crm/contacts/{$subscribed}/subscription", ['status' => 'subscribed'])->assertOk();
        $tag = $this->postJson('/api/admin/crm/segments', ['kind' => 'tag', 'name' => 'Newsletter'])->assertOk()->json('id');
        $this->putJson("/api/admin/crm/contacts/{$subscribed}/segments", ['segment_ids' => [$tag]])->assertOk();
        $this->putJson("/api/admin/crm/contacts/{$unsubscribed}/segments", ['segment_ids' => [$tag]])->assertOk();
        $id = $this->postJson('/api/admin/crm/email-programs', [
            'kind' => 'recurring', 'name' => 'Weekly update', 'enabled' => true, 'segment_id' => $tag,
            'frequency' => 'weekly', 'next_run_at' => now()->subMinute()->toIso8601String(),
            'editor_type' => 'classic', 'subject' => 'Hello {{name}}', 'body' => 'News for {{email}}',
        ])->assertOk()->json('program.id');
        $this->artisan('crm:run-email-programs')->assertExitCode(0);
        $this->assertDatabaseHas('crm_email_program_runs', ['program_id' => $id, 'status' => 'sent']);
        $this->assertDatabaseCount('crm_campaign_deliveries', 1);
        $this->assertDatabaseHas('crm_campaign_deliveries', ['contact_id' => $subscribed, 'status' => 'sent']);
        $this->assertDatabaseMissing('crm_campaign_deliveries', ['contact_id' => $unsubscribed]);
        $this->artisan('crm:run-email-programs')->assertExitCode(0);
        $this->assertDatabaseCount('crm_email_program_runs', 1);
        $this->assertDatabaseCount('crm_campaign_deliveries', 1);
        $this->assertTrue(DB::table('crm_email_programs')->where('id', $id)->value('next_run_at') > now()->toDateTimeString());
    }

    public function test_sequence_enrolls_subscribers_and_sends_steps_in_order(): void
    {
        $this->signIn();
        Mail::fake();
        $id = $this->postJson('/api/admin/crm/email-programs', [
            'kind' => 'sequence', 'name' => 'Welcome series', 'enabled' => true,
            'editor_type' => 'classic', 'steps' => [
                ['delay_days' => 0, 'subject' => 'Welcome', 'body' => 'First email'],
                ['delay_days' => 1, 'subject' => 'Next step', 'body' => 'Second email'],
            ],
        ])->assertOk()->json('program.id');
        $contact = $this->postJson('/api/admin/crm/contacts', ['name' => 'Ada', 'email' => 'ada@example.test'])->assertOk()->json('contact.id');
        $this->putJson("/api/admin/crm/contacts/{$contact}/subscription", ['status' => 'subscribed'])->assertOk();
        $this->assertDatabaseHas('crm_email_program_enrollments', ['program_id' => $id, 'contact_id' => $contact, 'next_step' => 0]);
        $this->artisan('crm:run-email-programs')->assertExitCode(0);
        $this->assertDatabaseHas('crm_email_program_enrollments', ['program_id' => $id, 'contact_id' => $contact, 'next_step' => 1, 'status' => 'active']);
        $this->assertDatabaseCount('crm_campaign_deliveries', 1);
        $this->travel(2)->days();
        $this->artisan('crm:run-email-programs')->assertExitCode(0);
        $this->assertDatabaseHas('crm_email_program_enrollments', ['program_id' => $id, 'contact_id' => $contact, 'next_step' => 2, 'status' => 'completed']);
        $this->assertDatabaseCount('crm_campaign_deliveries', 2);
        $this->artisan('crm:run-email-programs')->assertExitCode(0);
        $this->assertDatabaseCount('crm_campaign_deliveries', 2);
    }

    public function test_viewer_cannot_create_program_and_missing_content_is_rejected(): void
    {
        $this->signIn('viewer');
        $this->getJson('/api/admin/crm/email-programs?kind=recurring')->assertOk();
        $this->postJson('/api/admin/crm/email-programs', ['kind' => 'recurring', 'name' => 'Blocked'])->assertForbidden();
    }

    public function test_unsubscribing_stops_a_sequence_before_delivery(): void
    {
        $this->signIn();
        Mail::fake();
        $id = $this->postJson('/api/admin/crm/email-programs', [
            'kind' => 'sequence', 'name' => 'Welcome', 'enabled' => true, 'editor_type' => 'classic',
            'steps' => [['delay_days' => 0, 'subject' => 'Welcome', 'body' => 'Hello']],
        ])->assertOk()->json('program.id');
        $contact = $this->postJson('/api/admin/crm/contacts', ['name' => 'Ada', 'email' => 'ada@example.test'])->assertOk()->json('contact.id');
        $this->putJson("/api/admin/crm/contacts/{$contact}/subscription", ['status' => 'subscribed'])->assertOk();
        $this->putJson("/api/admin/crm/contacts/{$contact}/subscription", ['status' => 'unsubscribed'])->assertOk();
        $this->artisan('crm:run-email-programs')->assertExitCode(0);
        $this->assertDatabaseHas('crm_email_program_enrollments', ['program_id' => $id, 'contact_id' => $contact, 'status' => 'stopped']);
        $this->assertDatabaseCount('crm_campaign_deliveries', 0);
    }

    public function test_incomplete_workflow_is_not_saved(): void
    {
        $this->signIn();
        $this->postJson('/api/admin/crm/email-programs', [
            'kind' => 'recurring', 'name' => 'Empty', 'enabled' => true, 'frequency' => 'daily',
            'next_run_at' => now()->addHour()->toIso8601String(), 'editor_type' => 'html', 'subject' => '', 'body' => '',
        ])->assertStatus(422);
        $this->assertDatabaseCount('crm_email_programs', 0);
    }
}
