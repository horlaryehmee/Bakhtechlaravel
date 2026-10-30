<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CrmEmailOpenTrackingTest extends TestCase
{
    use RefreshDatabase;

    private function sentCampaign(string $editor = 'html'): array
    {
        $admin = DB::table('admins')->insertGetId(['email' => uniqid().'@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'), 'role' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($admin)));
        $contact = DB::table('crm_contacts')->insertGetId(['name' => 'Alex <Test>', 'email' => uniqid().'@example.test', 'subscription_status' => 'subscribed', 'created_at' => now(), 'updated_at' => now()]);
        $campaign = $this->postJson('/api/admin/crm/campaigns', ['name' => 'Tracked campaign', 'subject' => 'Hello {{name}}', 'body' => $editor === 'classic' ? "Hello {{name}}\nSecond line" : '<html><body>Hello {{name}}</body></html>', 'editor_type' => $editor])->assertOk()->json('id');
        $this->postJson("/api/admin/crm/campaigns/{$campaign}/launch")->assertOk();
        $this->postJson("/api/admin/crm/campaigns/{$campaign}/send-batch")->assertOk();
        return [$campaign, $contact, DB::table('crm_campaign_deliveries')->where('campaign_id', $campaign)->where('contact_id', $contact)->first()];
    }

    public function test_sender_embeds_recipient_pixel_in_all_editors_and_keeps_classic_text(): void
    {
        config(['app.url' => 'https://crm.example.test', 'mail.default' => 'array']);
        foreach (['html', 'default', 'visual', 'classic'] as $editor) {
            [, , $delivery] = $this->sentCampaign($editor);
            $this->assertSame('sent', $delivery->status);
            $this->assertNotNull($delivery->tracked_at);
            $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
            $email = $messages->last()->getOriginalMessage();
            $this->assertStringContainsString('https://crm.example.test/api/crm/email/open/'.$delivery->tracking_token, $email->getHtmlBody());
            $this->assertStringContainsString('Alex &lt;Test&gt;', $email->getHtmlBody());
            $this->assertSame(1, substr_count($email->getHtmlBody(), '/api/crm/email/open/'));
            if ($editor === 'classic') $this->assertStringContainsString("Hello Alex <Test>\nSecond line", $email->getTextBody());
        }
    }

    public function test_public_pixel_records_first_and_repeat_opens_and_reports_unique_rate(): void
    {
        [$campaign, $contact, $delivery] = $this->sentCampaign();
        $path = '/api/crm/email/open/'.$delivery->tracking_token;
        $this->withHeader('Authorization', '')->get($path)->assertOk()->assertHeader('Content-Type', 'image/gif');
        $first = DB::table('crm_campaign_deliveries')->find($delivery->id);
        $this->travel(5)->minutes();
        $response = $this->get($path)->assertOk();
        $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        $second = DB::table('crm_campaign_deliveries')->find($delivery->id);
        $this->assertSame(2, $second->open_count);
        $this->assertSame($first->opened_at, $second->opened_at);
        $this->assertNotSame($first->last_opened_at, $second->last_opened_at);
        $this->assertSame(1, DB::table('crm_activities')->where('source_type', 'email_open')->where('source_id', $delivery->id)->count());
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->first()));
        $date = today()->toDateString();
        $this->getJson("/api/admin/crm/dashboard?start=$date&end=$date")->assertOk()->assertJsonPath('engagement.opened', 1)->assertJsonPath('engagement.openRate', 100)->assertJsonPath('engagement.opens', 2)->assertJsonPath('recentOpens.0.contact_id', $contact);
        $this->getJson("/api/admin/crm/campaigns/{$campaign}/deliveries?status=opened")->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.open_count', 2)->assertJsonMissingPath('data.0.tracking_token');
        $this->getJson("/api/admin/crm/campaigns/{$campaign}/deliveries?status=unopened")->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/admin/crm/email-activities?page=1&status=opened')->assertOk()->assertJsonPath('counts.opened', 1);
        $this->getJson('/api/admin/crm/campaigns')->assertOk()->assertJsonPath('0.opened_count', 1)->assertJsonPath('0.tracked_count', 1);
    }

    public function test_unknown_head_and_unsent_requests_do_not_create_open_events(): void
    {
        [, , $delivery] = $this->sentCampaign();
        $path = '/api/crm/email/open/'.$delivery->tracking_token;
        $this->head($path)->assertOk();
        $this->get('/api/crm/email/open/'.str_repeat('x', 64))->assertOk();
        foreach (['pending', 'failed', 'skipped'] as $status) {
            DB::table('crm_campaign_deliveries')->where('id', $delivery->id)->update(['status' => $status]);
            $this->get($path)->assertOk();
        }
        $this->assertDatabaseHas('crm_campaign_deliveries', ['id' => $delivery->id, 'opened_at' => null, 'open_count' => 0]);
        $this->assertSame(0, DB::table('crm_activities')->where('source_type', 'email_open')->count());
    }

    public function test_historical_untracked_messages_are_excluded_from_open_rate(): void
    {
        [$campaign, , $delivery] = $this->sentCampaign();
        DB::table('crm_campaign_deliveries')->where('id', $delivery->id)->update(['tracked_at' => null, 'tracking_token' => null]);
        $date = today()->toDateString();
        $this->getJson("/api/admin/crm/dashboard?start=$date&end=$date")->assertOk()->assertJsonPath('engagement.sent', 1)->assertJsonPath('engagement.tracked', 0)->assertJsonPath('engagement.openRate', null);
        $this->getJson("/api/admin/crm/campaigns/{$campaign}/deliveries?status=unopened")->assertOk()->assertJsonPath('total', 0);
    }
}
