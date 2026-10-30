<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class CrmMarketingTest extends TestCase
{
    use RefreshDatabase;

    public function test_segments_and_campaign_audience_include_only_subscribed_contacts(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'admin@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $yes = $this->postJson('/api/admin/crm/contacts', ['name' => 'Subscribed', 'email' => 'yes@example.test'])->json('contact.id');
        $no = $this->postJson('/api/admin/crm/contacts', ['name' => 'Unsubscribed', 'email' => 'no@example.test'])->json('contact.id');
        $segment = $this->postJson('/api/admin/crm/segments', ['kind' => 'list', 'name' => 'Newsletter'])->assertOk()->json('id');
        $this->putJson("/api/admin/crm/contacts/{$yes}/segments", ['segment_ids' => [$segment]])->assertOk();
        $this->putJson("/api/admin/crm/contacts/{$no}/segments", ['segment_ids' => [$segment]])->assertOk();
        $this->putJson("/api/admin/crm/contacts/{$yes}/subscription", ['status' => 'subscribed'])->assertOk();
        $campaign = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Welcome', 'subject' => 'Hello {{name}}', 'body' => 'Welcome', 'segment_id' => $segment])->assertOk()->json('id');
        $this->postJson("/api/admin/crm/campaigns/{$campaign}/launch")->assertOk()->assertJsonPath('counts.pending', 1);
        $this->assertDatabaseCount('crm_campaign_deliveries', 1);
        $this->assertDatabaseMissing('crm_campaign_deliveries', ['contact_id' => $no]);
        Mail::fake();
        $this->postJson("/api/admin/crm/campaigns/{$campaign}/send-batch")->assertOk()->assertJsonPath('counts.sent', 1);
        $this->assertDatabaseHas('crm_campaign_deliveries', ['contact_id' => $yes, 'status' => 'sent']);
        $unsubscribe = URL::temporarySignedRoute('crm.unsubscribe', now()->addDay(), ['contact' => $yes]);
        $this->get($unsubscribe)->assertOk();
        $this->assertDatabaseHas('crm_contacts', ['id' => $yes, 'subscription_status' => 'unsubscribed']);
    }

    public function test_viewer_cannot_change_marketing_records(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'viewer@example.test', 'name' => 'Viewer', 'password_hash' => bcrypt('secret'), 'role' => 'viewer', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $this->getJson('/api/admin/crm/segments')->assertOk();
        $this->postJson('/api/admin/crm/segments', ['kind' => 'tag', 'name' => 'VIP'])->assertForbidden();
    }

    public function test_csv_import_deduplicates_and_does_not_subscribe_contacts(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'admin@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $csv = "name,email,phone,company,source\nAda,ada@example.test,123,Acme,referral\nAda Again,ada@example.test,456,Acme,referral\n";
        $file = UploadedFile::fake()->createWithContent('contacts.csv', $csv);
        $this->post('/api/admin/crm/import', ['file' => $file])->assertOk()->assertJson(['created' => 1, 'updated' => 1]);
        $this->assertDatabaseHas('crm_contacts', ['email' => 'ada@example.test', 'name' => 'Ada Again', 'subscription_status' => 'unsubscribed']);
    }

    public function test_automations_apply_once_for_new_contacts_and_on_stage_change(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'admin@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $tag = $this->postJson('/api/admin/crm/segments', ['kind' => 'tag', 'name' => 'Fresh lead'])->assertOk()->json('id');
        $this->postJson('/api/admin/crm/automations', ['name' => 'Tag leads', 'enabled' => true, 'trigger_type' => 'contact_created', 'action_type' => 'segment', 'segment_id' => $tag])->assertOk();
        $this->postJson('/api/admin/crm/automations', ['name' => 'Follow up qualified', 'enabled' => true, 'trigger_type' => 'stage_changed', 'trigger_stage' => 'qualified', 'action_type' => 'task', 'task_title' => 'Send proposal', 'task_due_days' => 2])->assertOk();
        $contact = $this->postJson('/api/admin/crm/contacts', ['name' => 'Nora', 'email' => 'nora@example.test'])->assertOk();
        $id = $contact->json('contact.id');
        $this->assertDatabaseHas('crm_contact_segments', ['contact_id' => $id, 'segment_id' => $tag]);
        $this->putJson("/api/admin/crm/contacts/{$id}", ['stage' => 'qualified'])->assertOk();
        $this->putJson("/api/admin/crm/contacts/{$id}", ['stage' => 'qualified'])->assertOk();
        $this->assertDatabaseCount('crm_tasks', 1);
    }

    public function test_dashboard_reports_growth_and_delivery_totals(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'dashboard@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $contact = $this->postJson('/api/admin/crm/contacts', ['name' => 'Subscriber', 'email' => 'subscriber@example.test'])->assertOk()->json('contact.id');
        $this->putJson("/api/admin/crm/contacts/{$contact}/subscription", ['status' => 'subscribed'])->assertOk();
        $campaign = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Welcome', 'subject' => 'Hello', 'body' => 'Welcome'])->assertOk()->json('id');
        $this->postJson("/api/admin/crm/campaigns/{$campaign}/launch")->assertOk();
        Mail::fake();
        $this->postJson("/api/admin/crm/campaigns/{$campaign}/send-batch")->assertOk();
        $this->getJson('/api/admin/crm/dashboard?days=7')->assertOk()
            ->assertJsonPath('activeContacts', 1)
            ->assertJsonPath('campaigns', 1)
            ->assertJsonPath('emailsSent', 1)
            ->assertJsonPath('performance.sent', 1)
            ->assertJsonCount(7, 'growth')
            ->assertJsonCount(1, 'recentCampaigns')
            ->assertJsonFragment(['email' => 'subscriber@example.test'])
            ->assertJsonCount(0, 'recentAutomations');
    }

    public function test_contacts_table_filters_subscription_and_returns_lists_and_tags(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'admin@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $contactId = $this->postJson('/api/admin/crm/contacts', ['name' => 'Ada', 'email' => 'ada@example.test'])->assertOk()->json('contact.id');
        $listId = $this->postJson('/api/admin/crm/segments', ['kind' => 'list', 'name' => 'Newsletter'])->assertOk()->json('id');
        $tagId = $this->postJson('/api/admin/crm/segments', ['kind' => 'tag', 'name' => 'VIP'])->assertOk()->json('id');
        $this->putJson("/api/admin/crm/contacts/{$contactId}/segments", ['segment_ids' => [$listId, $tagId]])->assertOk();
        $this->putJson("/api/admin/crm/contacts/{$contactId}/subscription", ['status' => 'subscribed'])->assertOk();
        $this->getJson('/api/admin/crm/contacts?search=ada%40example.test&subscription=subscribed&sort=name&direction=asc')
            ->assertOk()->assertJsonPath('contacts.total', 1)
            ->assertJsonPath('contacts.data.0.segments.0.name', 'Newsletter')
            ->assertJsonPath('contacts.data.0.segments.1.name', 'VIP');
        $this->getJson('/api/admin/crm/contacts?search=ada%40example.test&subscription=unsubscribed')
            ->assertOk()->assertJsonPath('contacts.total', 0);
    }

    public function test_saved_segment_filters_contacts_dynamically(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'admin@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $contactId = $this->postJson('/api/admin/crm/contacts', ['name' => 'Ada', 'email' => 'ada@example.test'])->assertOk()->json('contact.id');
        $segment = $this->postJson('/api/admin/crm/saved-segments', [
            'name' => 'Qualified subscribers', 'filters' => ['stage' => 'qualified', 'subscription_status' => 'subscribed'],
        ])->assertOk()->json('id');
        $this->getJson('/api/admin/crm/saved-segments')->assertOk()->assertJsonPath('0.contacts', 0);
        $this->putJson("/api/admin/crm/contacts/{$contactId}", ['stage' => 'qualified'])->assertOk();
        $this->putJson("/api/admin/crm/contacts/{$contactId}/subscription", ['status' => 'subscribed'])->assertOk();
        $this->getJson('/api/admin/crm/saved-segments')->assertJsonPath('0.contacts', 1);
        $this->getJson("/api/admin/crm/contacts?saved_segment_id={$segment}")->assertJsonPath('contacts.total', 1);
    }

    public function test_campaign_can_be_duplicated_and_draft_deleted(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'campaigns@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $id = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Autumn update', 'subject' => 'News', 'body' => 'Hello'])->assertOk()->json('id');
        $copy = $this->postJson("/api/admin/crm/campaigns/{$id}/duplicate")->assertOk()->json('id');
        $this->assertDatabaseHas('crm_campaigns', ['id' => $copy, 'name' => 'Autumn update (copy)', 'status' => 'draft']);
        $this->getJson('/api/admin/crm/campaigns')->assertOk()->assertJsonCount(2);
        $this->deleteJson("/api/admin/crm/campaigns/{$copy}")->assertNoContent();
        $this->assertDatabaseMissing('crm_campaigns', ['id' => $copy]);
    }

    public function test_campaign_creation_stores_editor_before_content_is_added(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'editor@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $id = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Newsletter', 'editor_type' => 'html'])->assertOk()->assertJsonPath('editor_type', 'html')->json('id');
        $this->postJson("/api/admin/crm/campaigns/{$id}/launch")->assertStatus(422);
        $this->putJson("/api/admin/crm/campaigns/{$id}", ['name' => 'Newsletter', 'subject' => 'Hello', 'body' => '<h1>Welcome</h1>', 'editor_type' => 'html'])->assertOk();
        $this->postJson("/api/admin/crm/campaigns/{$id}/duplicate")->assertOk()->assertJsonPath('editor_type', 'html');
    }

    public function test_email_templates_and_patterns_are_persisted_and_separate(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'assets@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $template = $this->postJson('/api/admin/crm/email-assets', ['kind' => 'template', 'name' => 'Welcome', 'subject' => 'Hello', 'body' => 'Hi {{name}}'])->assertOk()->json('id');
        $this->getJson('/api/admin/crm/email-assets?kind=template')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/admin/crm/email-assets?kind=pattern')->assertOk()->assertJsonCount(0);
        $this->putJson("/api/admin/crm/email-assets/{$template}", ['kind' => 'template', 'name' => 'Updated', 'subject' => 'Hello', 'body' => 'Hello {{name}}'])->assertOk()->assertJsonPath('name', 'Updated');
        $this->deleteJson("/api/admin/crm/email-assets/{$template}")->assertNoContent();
        $this->getJson('/api/admin/crm/email-assets?kind=template')->assertJsonCount(0);
    }

    public function test_default_editor_campaign_sends_html_to_subscribed_contact(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'html@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $contact = $this->postJson('/api/admin/crm/contacts', ['name' => 'Ada', 'email' => 'ada@example.test'])->assertOk()->json('contact.id');
        $this->putJson("/api/admin/crm/contacts/{$contact}/subscription", ['status' => 'subscribed'])->assertOk();
        $campaign = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Blocks', 'subject' => 'Welcome', 'body' => '<div data-crm-block="heading"><h1>Hello {{name}}</h1></div>', 'editor_type' => 'default'])->assertOk()->json('id');
        $this->postJson("/api/admin/crm/campaigns/{$campaign}/launch")->assertOk();
        Mail::fake();
        $this->postJson("/api/admin/crm/campaigns/{$campaign}/send-batch")->assertOk()->assertJsonPath('counts.sent', 1);
        $this->assertDatabaseHas('crm_campaign_deliveries', ['campaign_id' => $campaign, 'contact_id' => $contact, 'status' => 'sent']);
    }

    public function test_automation_list_actions_and_activity_history(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'funnels@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $tag = $this->postJson('/api/admin/crm/segments', ['kind' => 'tag', 'name' => 'Lead'])->assertOk()->json('id');
        $id = $this->postJson('/api/admin/crm/automations', ['name' => 'Tag new contacts', 'enabled' => true, 'trigger_type' => 'contact_created', 'action_type' => 'segment', 'segment_id' => $tag])->assertOk()->json('id');
        $contact = $this->postJson('/api/admin/crm/contacts', ['name' => 'Ada', 'email' => 'ada@example.test'])->assertOk()->json('contact.id');
        $this->getJson('/api/admin/crm/automations')->assertOk()->assertJsonStructure([['run_count']]);
        $this->getJson("/api/admin/crm/automations/{$id}/runs")->assertOk()->assertJsonFragment(['contact_id' => $contact]);
        $copy = $this->postJson("/api/admin/crm/automations/{$id}/duplicate")->assertOk()->json('id');
        $this->assertDatabaseHas('crm_automations', ['id' => $copy, 'enabled' => false]);
        $this->deleteJson("/api/admin/crm/automations/{$copy}")->assertNoContent();
        $this->assertDatabaseMissing('crm_automations', ['id' => $copy]);
    }

    public function test_automation_runs_multiple_ordered_actions_once(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'steps@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $tag = $this->postJson('/api/admin/crm/segments', ['kind' => 'tag', 'name' => 'Welcome'])->assertOk()->json('id');
        $steps = [
            ['action_type' => 'segment', 'segment_id' => $tag],
            ['action_type' => 'task', 'task_title' => 'Call new lead', 'task_due_days' => 2],
        ];
        $id = $this->postJson('/api/admin/crm/automations', [
            'name' => 'Welcome flow', 'enabled' => true, 'trigger_type' => 'contact_created',
            'action_type' => 'segment', 'segment_id' => $tag, 'steps' => $steps,
        ])->assertOk()->json('id');
        $contact = $this->postJson('/api/admin/crm/contacts', ['name' => 'Ada', 'email' => 'ada@example.test'])->assertOk()->json('contact.id');
        $this->assertDatabaseHas('crm_contact_segments', ['contact_id' => $contact, 'segment_id' => $tag]);
        $this->assertDatabaseHas('crm_tasks', ['contact_id' => $contact, 'title' => 'Call new lead']);
        $this->assertSame(1, DB::table('crm_tasks')->where('contact_id', $contact)->count());
        app(\App\Services\CrmAutomationService::class)->run($contact, 'contact_created');
        $this->assertSame(1, DB::table('crm_tasks')->where('contact_id', $contact)->count());
        $copy = $this->postJson("/api/admin/crm/automations/{$id}/duplicate")->assertOk()->json('id');
        $this->assertSame(json_decode(DB::table('crm_automations')->find($id)->steps_json, true), json_decode(DB::table('crm_automations')->find($copy)->steps_json, true));
        $this->postJson('/api/admin/crm/automations', [
            'name' => 'Invalid flow', 'enabled' => false, 'trigger_type' => 'contact_created',
            'action_type' => 'segment', 'segment_id' => $tag,
            'steps' => [['action_type' => 'task']],
        ])->assertUnprocessable();
    }

    public function test_connected_forms_show_real_entries_and_filter_crm_contacts(): void
    {
        $adminId = DB::table('admins')->insertGetId(['email' => 'forms@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        DB::table('contact_messages')->insert(['name' => 'Ada', 'email' => 'ada@example.test', 'subject' => 'Hello', 'message' => 'I need a website', 'created_at' => now(), 'updated_at' => now()]);
        $this->getJson('/api/admin/crm/forms')->assertOk()->assertJsonFragment(['id' => 'message', 'entries' => 1, 'crm_contacts' => 1]);
        $this->getJson('/api/admin/crm/contacts?form_source=message')->assertOk()->assertJsonPath('contacts.total', 1);
        $this->getJson('/api/admin/crm/contacts?form_source=booking')->assertOk()->assertJsonPath('contacts.total', 0);
    }
}
