<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CrmContactDetailTest extends TestCase
{
    use RefreshDatabase;

    public function test_contact_brief_only_includes_its_own_relationships_and_deliveries(): void
    {
        $admin = DB::table('admins')->insertGetId(['name' => 'Sales owner', 'email' => 'sales@example.test', 'password_hash' => bcrypt('secret'), 'role' => 'staff']);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($admin)));
        $company = DB::table('crm_companies')->insertGetId(['name' => 'Example company', 'address' => 'Lagos']);
        $contact = DB::table('crm_contacts')->insertGetId(['name' => 'Ada', 'email' => 'ada@example.test', 'owner_id' => $admin, 'company_id' => $company]);
        $other = DB::table('crm_contacts')->insertGetId(['name' => 'Other contact', 'email' => 'other@example.test']);
        $segment = DB::table('crm_segments')->insertGetId(['kind' => 'tag', 'name' => 'Priority']);
        DB::table('crm_contact_segments')->insert(['contact_id' => $contact, 'segment_id' => $segment]);
        $campaign = DB::table('crm_campaigns')->insertGetId(['name' => 'Welcome', 'subject' => 'Welcome aboard', 'body' => 'Hello']);
        foreach ([$contact, $other] as $id) {
            DB::table('crm_campaign_deliveries')->insert(['contact_id' => $id, 'campaign_id' => $campaign, 'status' => 'sent', 'sent_at' => now(), 'created_at' => now()]);
        }

        $this->getJson("/api/admin/crm/contacts/{$contact}")->assertOk()
            ->assertJsonPath('owner.name', 'Sales owner')
            ->assertJsonPath('company.address', 'Lagos')
            ->assertJsonCount(1, 'segments')
            ->assertJsonPath('segments.0.name', 'Priority')
            ->assertJsonCount(1, 'emailHistory')
            ->assertJsonPath('emailHistory.0.subject', 'Welcome aboard');
        $this->getJson("/api/admin/crm/contacts/{$other}")->assertOk()->assertJsonCount(0, 'segments')->assertJsonPath('owner', null);
    }

    public function test_task_editor_updates_title_due_date_priority_and_completion_together(): void
    {
        $admin = DB::table('admins')->insertGetId(['name' => 'Staff', 'email' => 'staff@example.test', 'password_hash' => bcrypt('secret'), 'role' => 'staff']);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($admin)));
        $contact = DB::table('crm_contacts')->insertGetId(['name' => 'Ada']);
        $task = DB::table('crm_tasks')->insertGetId(['contact_id' => $contact, 'title' => 'Old follow-up']);
        $this->putJson("/api/admin/crm/tasks/{$task}", ['title' => 'Send proposal', 'due_at' => '2026-11-12', 'priority' => 'high', 'status' => 'completed'])->assertOk();
        $this->assertDatabaseHas('crm_tasks', ['id' => $task, 'title' => 'Send proposal', 'due_at' => '2026-11-12', 'priority' => 'high', 'completed' => 1]);
        $this->putJson("/api/admin/crm/tasks/{$task}", ['title' => ''])->assertUnprocessable();
    }

    public function test_contact_without_email_does_not_match_other_clients_with_blank_email(): void
    {
        $admin = DB::table('admins')->insertGetId(['name' => 'Staff', 'email' => 'staff@example.test', 'password_hash' => bcrypt('secret'), 'role' => 'staff']);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($admin)));
        $contact = DB::table('crm_contacts')->insertGetId(['name' => 'No email']);
        $client = DB::table('invoice_clients')->insertGetId(['name' => 'Unrelated client', 'email' => '']);
        DB::table('invoice_documents')->insert(['client_id' => $client, 'number' => 'INV-EMPTY', 'public_token' => 'unrelated-document']);
        $this->getJson("/api/admin/crm/contacts/{$contact}")->assertOk()->assertJsonCount(0, 'documents');
    }
}
