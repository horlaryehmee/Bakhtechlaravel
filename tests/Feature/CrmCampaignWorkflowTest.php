<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CrmCampaignWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $id = DB::table('admins')->insertGetId(['email' => 'workflow@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($id)));
    }

    public function test_preview_matches_prepared_audience_without_sending(): void
    {
        Mail::fake();
        $segment = $this->postJson('/api/admin/crm/segments', ['kind' => 'list', 'name' => 'Newsletter'])->assertOk()->json('id');
        foreach ([['Valid', 'valid@example.test', 'subscribed'], ['Invalid', 'invalid', 'subscribed'], ['Opted out', 'out@example.test', 'unsubscribed']] as [$name, $email, $status]) {
            $id = DB::table('crm_contacts')->insertGetId(['name' => $name, 'email' => $email, 'subscription_status' => $status, 'created_at' => now(), 'updated_at' => now()]);
            $this->putJson("/api/admin/crm/contacts/{$id}/segments", ['segment_ids' => [$segment]])->assertOk();
        }
        DB::table('crm_contacts')->insert(['name' => 'Other audience', 'email' => 'other@example.test', 'subscription_status' => 'subscribed', 'created_at' => now(), 'updated_at' => now()]);
        $this->getJson('/api/admin/crm/campaign-audience?segment_id='.$segment)->assertOk()->assertJsonPath('total', 3)->assertJsonPath('eligible', 1)->assertJsonPath('invalidEmail', 1)->assertJsonPath('unsubscribed', 1)->assertJsonCount(1, 'sample');
        $id = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Workflow', 'subject' => 'Hello', 'body' => 'Welcome', 'segment_id' => $segment])->assertOk()->json('id');
        $this->postJson("/api/admin/crm/campaigns/{$id}/launch")->assertOk()->assertJsonPath('counts.pending', 1);
        Mail::assertNothingSent();
        $this->assertDatabaseCount('crm_campaign_deliveries', 1);
        $this->putJson("/api/admin/crm/campaigns/{$id}", ['name' => 'Changed'])->assertStatus(422);
    }

    public function test_recipient_report_paginates_and_filters_within_campaign(): void
    {
        $campaign = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Report'])->assertOk()->json('id');
        $other = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Other'])->assertOk()->json('id');
        for ($i = 0; $i < 28; $i++) {
            $contact = DB::table('crm_contacts')->insertGetId(['name' => 'Recipient '.$i, 'email' => "person{$i}@example.test", 'created_at' => now(), 'updated_at' => now()]);
            DB::table('crm_campaign_deliveries')->insert(['campaign_id' => $i === 27 ? $other : $campaign, 'contact_id' => $contact, 'status' => $i === 0 ? 'failed' : 'pending', 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->getJson("/api/admin/crm/campaigns/{$campaign}/deliveries")->assertOk()->assertJsonPath('total', 27)->assertJsonCount(25, 'data');
        $this->getJson("/api/admin/crm/campaigns/{$campaign}/deliveries?page=2")->assertOk()->assertJsonCount(2, 'data');
        $this->getJson("/api/admin/crm/campaigns/{$campaign}/deliveries?status=failed")->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.email', 'person0@example.test');
        $this->getJson("/api/admin/crm/campaigns/{$campaign}/deliveries?search=person27")->assertOk()->assertJsonPath('total', 0);
        $this->getJson("/api/admin/crm/campaigns/{$campaign}/deliveries?status=unknown")->assertUnprocessable();
    }

    public function test_each_editor_preserves_markup_and_personalization_when_reopened(): void
    {
        foreach (['default', 'visual', 'html'] as $editor) {
            $body = '<div data-crm-'.($editor === 'visual' ? 'visual' : 'block').'="text" data-padding="32" data-font-size="18" data-color="#123456" data-background="#ffffff" data-align="center"><p>Hello {{name}}<br>Second line &amp; more</p></div>';
            $id = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Editor '.$editor, 'editor_type' => $editor, 'body' => $body])->assertOk()->json('id');
            $body .= "\n<p>Contact {{email}}</p>";
            $this->putJson("/api/admin/crm/campaigns/{$id}", ['name' => 'Editor '.$editor, 'editor_type' => $editor, 'subject' => 'Hello {{name}}', 'body' => $body])->assertOk();
            $this->getJson("/api/admin/crm/campaigns/{$id}")->assertOk()->assertJsonPath('campaign.editor_type', $editor)->assertJsonPath('campaign.body', $body)->assertJsonPath('campaign.subject', 'Hello {{name}}');
        }
    }
}
