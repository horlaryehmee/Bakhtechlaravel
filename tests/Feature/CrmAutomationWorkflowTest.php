<?php

namespace Tests\Feature;

use App\Services\CrmAutomationService;
use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class CrmAutomationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $id = DB::table('admins')->insertGetId(['name' => 'Admin', 'email' => 'automation@example.test', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($id)));
        Mail::fake();
    }

    private function contact(array $changes = []): int
    {
        return DB::table('crm_contacts')->insertGetId(array_merge(['name' => 'Ada Example', 'email' => 'ada@example.test', 'stage' => 'new', 'source' => 'manual', 'subscription_status' => 'subscribed', 'created_at' => now(), 'updated_at' => now()], $changes));
    }

    private function segment(string $name = 'Welcome'): int
    {
        return $this->postJson('/api/admin/crm/segments', ['kind' => 'tag', 'name' => $name])->assertOk()->json('id');
    }

    private function sequence(?int $segment = null): int
    {
        return $this->postJson('/api/admin/crm/email-programs', ['kind' => 'sequence', 'name' => 'Welcome emails', 'enabled' => true, 'segment_id' => $segment, 'editor_type' => 'html', 'steps' => [['subject' => 'Welcome', 'body' => '<p>Hello {{name}}</p>', 'delay_days' => 2]]])->assertOk()->json('program.id');
    }

    private function rule(array $changes = []): array
    {
        return array_merge(['name' => 'Follow up', 'enabled' => true, 'trigger_type' => 'contact_created', 'steps' => [['action_type' => 'task', 'task_title' => 'Call {{name}}', 'task_due_days' => 2, 'task_priority' => 'high']]], $changes);
    }

    public function test_ordered_actions_are_real_and_duplicate_events_are_ignored(): void
    {
        $tag = $this->segment(); $old = $this->segment('Old'); $sequence = $this->sequence($tag); $contact = $this->contact();
        DB::table('crm_contact_segments')->insert(['contact_id' => $contact, 'segment_id' => $old]);
        $steps = [['action_type' => 'segment', 'segment_id' => $tag], ['action_type' => 'remove_segment', 'segment_id' => $old], ['action_type' => 'task', 'task_title' => 'Call {{name}}', 'task_due_days' => 2, 'task_priority' => 'high'], ['action_type' => 'note', 'note_body' => 'Email: {{email}}'], ['action_type' => 'sequence', 'sequence_id' => $sequence]];
        $id = $this->postJson('/api/admin/crm/automations', $this->rule(['steps' => $steps]))->assertOk()->json('id');
        $service = app(CrmAutomationService::class);
        $service->run($contact, 'contact_created'); $service->run($contact, 'contact_created');
        $this->assertDatabaseCount('crm_automation_runs', 1);
        $this->assertDatabaseCount('crm_tasks', 1);
        $this->assertDatabaseHas('crm_tasks', ['contact_id' => $contact, 'title' => 'Call Ada Example', 'priority' => 'high', 'due_at' => now()->addDays(2)->toDateString()]);
        $this->assertDatabaseHas('crm_contact_segments', ['contact_id' => $contact, 'segment_id' => $tag]);
        $this->assertDatabaseMissing('crm_contact_segments', ['contact_id' => $contact, 'segment_id' => $old]);
        $this->assertDatabaseHas('crm_activities', ['contact_id' => $contact, 'type' => 'note', 'body' => 'Email: ada@example.test']);
        $this->assertDatabaseHas('crm_email_program_enrollments', ['program_id' => $sequence, 'contact_id' => $contact, 'status' => 'active']);
        $this->getJson("/api/admin/crm/automations/{$id}/runs")->assertOk()->assertJsonPath('0.status', 'completed')->assertJsonCount(5, '0.results');
        $this->getJson("/api/admin/crm/automations/{$id}")->assertOk()->assertJsonPath('completed_count', 1);
        Mail::assertNothingSent();
    }

    public function test_preview_executes_the_same_actions_but_rolls_back_every_change(): void
    {
        $tag = $this->segment(); $sequence = $this->sequence($tag); $contact = $this->contact();
        $payload = $this->rule(['enabled' => false, 'contact_id' => $contact, 'steps' => [['action_type' => 'segment', 'segment_id' => $tag], ['action_type' => 'task', 'task_title' => 'Preview task'], ['action_type' => 'note', 'note_body' => 'Preview note'], ['action_type' => 'sequence', 'sequence_id' => $sequence]]]);
        $this->postJson('/api/admin/crm/automations/preview', $payload)->assertOk()->assertJsonPath('status', 'completed')->assertJsonCount(4, 'results')->assertJsonPath('results.3.status', 'completed');
        foreach (['crm_tasks', 'crm_activities', 'crm_contact_segments', 'crm_email_program_enrollments', 'crm_automation_runs', 'crm_automations'] as $table) $this->assertDatabaseCount($table, 0);
        Mail::assertNothingSent();
    }

    public function test_failure_is_recorded_and_earlier_actions_are_rolled_back_then_retry_is_once(): void
    {
        $sequence = $this->sequence(); $contact = $this->contact();
        $id = $this->postJson('/api/admin/crm/automations', $this->rule(['steps' => [['action_type' => 'task', 'task_title' => 'Original task'], ['action_type' => 'sequence', 'sequence_id' => $sequence]]]))->assertOk()->json('id');
        DB::table('crm_email_programs')->where('id', $sequence)->update(['enabled' => false]);
        app(CrmAutomationService::class)->run($contact, 'contact_created');
        $this->assertDatabaseCount('crm_tasks', 0);
        $run = DB::table('crm_automation_runs')->first();
        $this->assertSame('failed', $run->status);
        $this->assertStringContainsString('paused', $run->error);
        // Changing the workflow must not change the failed run's saved action plan.
        $this->putJson("/api/admin/crm/automations/{$id}", $this->rule(['steps' => [['action_type' => 'note', 'note_body' => 'New plan']]]))->assertOk();
        DB::table('crm_email_programs')->where('id', $sequence)->update(['enabled' => true]);
        $this->postJson("/api/admin/crm/automations/{$id}/runs/{$run->id}/retry")->assertOk()->assertJsonPath('status', 'completed')->assertJsonPath('attempts', 2);
        $this->assertDatabaseHas('crm_tasks', ['title' => 'Original task']);
        $this->assertDatabaseCount('crm_activities', 0);
        $this->postJson("/api/admin/crm/automations/{$id}/runs/{$run->id}/retry")->assertUnprocessable();
        $this->assertDatabaseCount('crm_tasks', 1);
        Mail::assertNothingSent();
    }

    public function test_missing_resource_does_not_break_contact_creation(): void
    {
        $tag = $this->segment();
        $this->postJson('/api/admin/crm/automations', $this->rule(['steps' => [['action_type' => 'task', 'task_title' => 'Rolled back'], ['action_type' => 'segment', 'segment_id' => $tag]]]))->assertOk();
        DB::table('crm_segments')->where('id', $tag)->delete();
        $this->postJson('/api/admin/crm/contacts', ['name' => 'New contact', 'email' => 'new@example.test'])->assertOk();
        $this->assertDatabaseCount('crm_tasks', 0);
        $this->assertDatabaseHas('crm_automation_runs', ['status' => 'failed']);
        $this->assertDatabaseHas('crm_contacts', ['email' => 'new@example.test']);
    }

    public function test_filters_skip_without_side_effects_and_paused_rules_do_not_run(): void
    {
        $id = $this->postJson('/api/admin/crm/automations', $this->rule(['conditions' => ['source' => 'booking', 'subscription_status' => 'subscribed']]))->assertOk()->json('id');
        $contact = $this->contact();
        app(CrmAutomationService::class)->run($contact, 'contact_created');
        $this->assertDatabaseHas('crm_automation_runs', ['automation_id' => $id, 'status' => 'skipped']);
        $this->assertDatabaseCount('crm_tasks', 0);
        $this->postJson('/api/admin/crm/automations/preview', $this->rule(['contact_id' => $contact, 'conditions' => ['stage' => 'won']]))->assertOk()->assertJsonPath('status', 'skipped');
        $this->patchJson("/api/admin/crm/automations/{$id}/status", ['enabled' => false])->assertOk()->assertJsonPath('enabled', false);
        $this->postJson('/api/admin/crm/contacts', ['name' => 'Booking', 'email' => 'booking@example.test', 'source' => 'booking'])->assertOk();
        $this->assertDatabaseCount('crm_automation_runs', 1);
    }

    public function test_repeated_stage_transitions_in_the_same_millisecond_are_distinct(): void
    {
        $this->freezeTime();
        $this->postJson('/api/admin/crm/automations', $this->rule(['trigger_type' => 'stage_changed', 'trigger_stage' => 'qualified']))->assertOk();
        $contact = $this->contact();
        foreach (['qualified', 'qualified', 'new', 'qualified'] as $stage) $this->putJson("/api/admin/crm/contacts/{$contact}", ['stage' => $stage])->assertOk();
        $this->assertDatabaseCount('crm_tasks', 2);
        $this->assertDatabaseCount('crm_automation_runs', 2);
    }

    public function test_subscription_and_membership_triggers_fire_only_when_values_change(): void
    {
        $contact = $this->contact(['subscription_status' => 'unsubscribed']); $tag = $this->segment();
        $this->postJson('/api/admin/crm/automations', $this->rule(['trigger_type' => 'subscription_changed', 'trigger_subscription_status' => 'subscribed', 'steps' => [['action_type' => 'note', 'note_body' => 'Subscribed']]]))->assertOk();
        $this->postJson('/api/admin/crm/automations', $this->rule(['trigger_type' => 'segment_added', 'trigger_segment_id' => $tag]))->assertOk();
        for ($i = 0; $i < 2; $i++) {
            $this->putJson("/api/admin/crm/contacts/{$contact}/subscription", ['status' => 'subscribed'])->assertOk();
            $this->putJson("/api/admin/crm/contacts/{$contact}/segments", ['segment_ids' => [$tag]])->assertOk();
        }
        $this->assertDatabaseCount('crm_activities', 1); $this->assertDatabaseCount('crm_tasks', 1);
        $this->putJson("/api/admin/crm/contacts/{$contact}/segments", ['segment_ids' => []])->assertOk();
        $this->putJson("/api/admin/crm/contacts/{$contact}/segments", ['segment_ids' => [$tag]])->assertOk();
        $this->assertDatabaseCount('crm_tasks', 2);
        $this->postJson('/api/admin/crm/automations', $this->rule(['trigger_type' => 'subscription_changed', 'trigger_subscription_status' => 'unsubscribed', 'steps' => [['action_type' => 'note', 'note_body' => 'Unsubscribed']]]))->assertOk();
        $this->get(URL::temporarySignedRoute('crm.unsubscribe', now()->addDay(), ['contact' => $contact]))->assertOk();
        $this->assertDatabaseHas('crm_activities', ['body' => 'Unsubscribed']);
    }

    public function test_sequence_action_respects_consent_and_does_not_reenroll(): void
    {
        $sequence = $this->sequence(); $contact = $this->contact(['subscription_status' => 'unsubscribed']);
        $payload = $this->rule(['contact_id' => $contact, 'steps' => [['action_type' => 'sequence', 'sequence_id' => $sequence]]]);
        $this->postJson('/api/admin/crm/automations/preview', $payload)->assertOk()->assertJsonPath('results.0.status', 'skipped');
        $this->assertDatabaseCount('crm_email_program_enrollments', 0);
        DB::table('crm_contacts')->where('id', $contact)->update(['subscription_status' => 'subscribed']);
        $this->postJson('/api/admin/crm/automations', $payload)->assertOk();
        $service = app(CrmAutomationService::class);
        $service->run($contact, 'contact_created', null, 'first'); $service->run($contact, 'contact_created', null, 'second');
        $this->assertDatabaseCount('crm_email_program_enrollments', 1);
        $last = DB::table('crm_automation_runs')->orderByDesc('id')->first();
        $this->assertSame('skipped', json_decode($last->results_json, true)[0]['status']);
    }

    public function test_validation_status_and_activity_pagination(): void
    {
        $this->postJson('/api/admin/crm/automations', $this->rule(['steps' => [['action_type' => 'note']]]))->assertUnprocessable();
        $this->postJson('/api/admin/crm/automations', $this->rule(['trigger_type' => 'segment_added']))->assertUnprocessable();
        $this->postJson('/api/admin/crm/automations', $this->rule(['steps' => array_fill(0, 21, ['action_type' => 'task', 'task_title' => 'Too many'])]))->assertUnprocessable();
        $contact = $this->contact();
        $id = $this->postJson('/api/admin/crm/automations', $this->rule())->assertOk()->json('id');
        for ($i = 0; $i < 27; $i++) app(CrmAutomationService::class)->run($contact, 'contact_created', null, 'event-'.$i);
        $this->getJson('/api/admin/crm/automation-activity?status=completed')->assertOk()->assertJsonPath('total', 27)->assertJsonCount(25, 'data');
        $this->getJson('/api/admin/crm/automation-activity?page=2')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/admin/crm/automation-activity?status=failed')->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/admin/crm/automation-activity?search=nobody')->assertOk()->assertJsonPath('total', 0);
        $copy = $this->postJson("/api/admin/crm/automations/{$id}/duplicate")->assertOk()->assertJsonPath('enabled', false)->assertJsonPath('run_count', 0)->json('id');
        $this->deleteJson("/api/admin/crm/automations/{$copy}")->assertNoContent();
        $this->assertDatabaseCount('crm_tasks', 27);
    }

    public function test_viewer_cannot_save_preview_activate_or_retry(): void
    {
        $contact = $this->contact();
        $id = $this->postJson('/api/admin/crm/automations', $this->rule())->assertOk()->json('id');
        $viewerId = DB::table('admins')->insertGetId(['name' => 'Viewer', 'email' => 'viewer@example.test', 'password_hash' => bcrypt('secret'), 'role' => 'viewer', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($viewerId)));
        $this->getJson('/api/admin/crm/automations')->assertOk();
        $this->postJson('/api/admin/crm/automations', $this->rule())->assertForbidden();
        $this->postJson('/api/admin/crm/automations/preview', $this->rule(['contact_id' => $contact]))->assertForbidden();
        $this->patchJson("/api/admin/crm/automations/{$id}/status", ['enabled' => false])->assertForbidden();
        $this->postJson("/api/admin/crm/automations/{$id}/runs/1/retry")->assertForbidden();
    }
}
