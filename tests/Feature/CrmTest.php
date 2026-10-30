<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CrmTest extends TestCase
{
    use RefreshDatabase;

    public function test_crm_requires_an_admin_session(): void
    {
        $this->getJson('/api/admin/crm/contacts')->assertUnauthorized();
    }

    public function test_crm_unifies_sources_and_supports_contact_workflow(): void
    {
        $adminId = DB::table('admins')->insertGetId([
            'email' => 'admin@example.test', 'name' => 'Admin', 'password_hash' => bcrypt('secret'),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $token = AdminToken::make(DB::table('admins')->find($adminId));
        $this->withHeader('Authorization', 'Bearer '.$token);
        DB::table('contact_messages')->insert([
            'name' => 'Ada', 'email' => 'ADA@example.test', 'message' => 'Need a website',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $list = $this->getJson('/api/admin/crm/contacts?search=ada%40example.test')->assertOk();
        $list->assertJsonPath('contacts.total', 1);
        $id = $list->json('contacts.data.0.id');
        $this->putJson("/api/admin/crm/contacts/{$id}", ['stage' => 'qualified', 'notes' => 'Call tomorrow'])->assertOk()->assertJsonPath('contact.stage', 'qualified');
        $this->postJson("/api/admin/crm/contacts/{$id}/activities", ['type' => 'call', 'subject' => 'Discovery call'])->assertOk();
        $task = $this->postJson("/api/admin/crm/contacts/{$id}/tasks", ['title' => 'Send proposal'])->assertOk();
        $taskId = $task->json('tasks.0.id');
        $this->putJson("/api/admin/crm/tasks/{$taskId}", ['completed' => true])->assertOk();
        $this->getJson("/api/admin/crm/contacts/{$id}")->assertOk()->assertJsonCount(2, 'activities')->assertJsonPath('tasks.0.completed', 1);
        $this->getJson('/api/admin/crm/contacts?search=ada%40example.test')->assertJsonPath('contacts.total', 1);
    }

    public function test_deals_projects_and_reports_share_one_contact(): void
    {
        $adminId = DB::table('admins')->insertGetId([
            'email' => 'sales@example.test', 'name' => 'Sales', 'password_hash' => bcrypt('secret'),
            'role' => 'staff', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->withHeader('Authorization', 'Bearer '.AdminToken::make(DB::table('admins')->find($adminId)));
        $contact = $this->postJson('/api/admin/crm/contacts', ['name' => 'Nora', 'email' => 'nora@example.test'])->assertOk();
        $contactId = $contact->json('contact.id');
        $deal = $this->postJson('/api/admin/crm/deals', [
            'contact_id' => $contactId, 'title' => 'Storefront', 'stage' => 'won',
            'estimated_value' => 500000, 'agreed_value' => 450000,
        ])->assertOk();
        $this->postJson('/api/admin/crm/projects', [
            'contact_id' => $contactId, 'deal_id' => $deal->json('id'), 'title' => 'Storefront build', 'status' => 'active',
        ])->assertOk();
        $this->getJson("/api/admin/crm/contacts/{$contactId}")->assertJsonCount(1, 'deals')->assertJsonCount(1, 'projects')->assertJsonPath('contact.stage', 'won');
        $this->getJson('/api/admin/crm/overview')->assertOk()->assertJsonPath('dealsWon', 1)->assertJsonPath('activeProjects', 1);
        $this->postJson('/api/admin/crm/projects', [
            'contact_id' => $contactId, 'deal_id' => 99999, 'title' => 'Invalid', 'status' => 'planned',
        ])->assertUnprocessable();
    }
}
