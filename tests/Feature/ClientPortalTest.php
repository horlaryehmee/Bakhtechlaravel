<?php
namespace Tests\Feature;

use App\Models\ClientProject;
use App\Services\ClientPortalAccess;
use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ClientPortalTest extends TestCase
{
    use RefreshDatabase;
    private function client(string $email): array
    {
        $id = DB::table('users')->insertGetId(['name' => $email, 'email' => $email, 'password' => Hash::make('Secure-test-password-42'), 'portal_active' => true]);
        $response = $this->postJson('/api/portal/login', ['email' => $email, 'password' => 'Secure-test-password-42'])->assertOk();
        return [$id, ['Authorization' => 'Bearer '.$response->json('token')]];
    }
    private function admin(string $role = 'admin'): array
    {
        $id = DB::table('admins')->insertGetId(['name' => 'Portal tester', 'email' => $role.'@portal.test', 'password_hash' => Hash::make('Secure-test-password-42'), 'role' => $role]);
        return ['Authorization' => 'Bearer '.AdminToken::make(DB::table('admins')->where('id', $id)->first())];
    }
    private function project(int $user): ClientProject
    {
        return ClientProject::create(['client_id' => $user, 'title' => 'Test shop', 'reference' => 'TEST-'.$user, 'category' => 'ecommerce', 'status' => 'pending', 'product_limit' => 2]);
    }

    public function test_clients_cannot_read_or_write_each_others_projects_products_or_files(): void
    {
        Storage::fake('local');
        [$a, $ha] = $this->client('a@portal.test'); [$b, $hb] = $this->client('b@portal.test');
        $p = $this->project($a); $this->project($b);
        $product = $this->postJson("/api/portal/projects/$p->id/products", ['name' => 'Item', 'status' => 'draft', 'stock' => 2], $ha)->assertOk()->json('id');
        $file = $this->postJson("/api/portal/projects/$p->id/files", ['file' => UploadedFile::fake()->create('brief.pdf', 5, 'application/pdf')], $ha)->assertOk()->json('id');
        $this->getJson("/api/portal/projects/$p->id", $hb)->assertNotFound();
        $this->getJson("/api/portal/projects/$p->id/products", $hb)->assertNotFound();
        $this->postJson("/api/portal/projects/$p->id/products/$product", ['name' => 'Stolen', 'status' => 'draft', 'stock' => 2], $hb)->assertNotFound();
        $this->getJson("/api/portal/projects/$p->id/files/$file", $hb)->assertNotFound();
        $this->getJson("/api/portal/projects/$p->id/files/$file", $ha)->assertOk();
        $this->getJson('/api/portal/overview', $hb)->assertJsonCount(1, 'projects');
        $this->postJson("/api/client-admin/projects/$p->id/review/products/$product", ['status' => 'approved'], $ha)->assertForbidden();
    }

    public function test_review_revision_resubmission_and_publication_are_separate_and_audited(): void
    {
        [$user, $headers] = $this->client('review@portal.test'); $admin = $this->admin(); $p = $this->project($user);
        $payload = ['name' => 'Product', 'price' => 100, 'stock' => 3, 'status' => 'submitted'];
        $id = $this->postJson("/api/portal/projects/$p->id/products", $payload, $headers)->assertOk()->json('id');
        $review = "/api/client-admin/projects/$p->id/review/products/$id";
        $this->postJson("/api/portal/projects/$p->id/products/$id", $payload, $headers)->assertUnprocessable();
        $this->postJson($review, ['status' => 'published', 'published_url' => 'https://example.com/item'], $admin)->assertUnprocessable();
        $this->postJson($review, ['status' => 'needs_revision'], $admin)->assertUnprocessable();
        $this->postJson($review, ['status' => 'needs_revision', 'revision_note' => 'Please expand the description.'], $admin)->assertOk();
        $this->postJson("/api/portal/projects/$p->id/products/$id", $payload + ['description' => 'Updated description'], $headers)->assertOk();
        $this->postJson($review, ['status' => 'approved'], $admin)->assertOk();
        $this->assertDatabaseHas('client_products', ['id' => $id, 'status' => 'approved', 'published_url' => null]);
        $this->postJson($review, ['status' => 'published', 'published_url' => 'https://example.com/item'], $admin)->assertOk();
        $this->assertDatabaseHas('client_activity', ['project_id' => $p->id, 'event' => 'Products needs_revision']);
        $this->assertDatabaseHas('client_notifications', ['user_id' => $user, 'project_id' => $p->id]);
    }

    public function test_limits_deactivation_staff_assignment_and_content_validation(): void
    {
        [$user, $headers] = $this->client('limits@portal.test'); $admin = $this->admin(); $staff = $this->admin('staff'); $p = $this->project($user);
        $this->getJson("/api/client-admin/projects/$p->id", $staff)->assertNotFound();
        $this->postJson('/api/client-admin/projects', [], $staff)->assertForbidden();
        $staffId = DB::table('admins')->where('role', 'staff')->value('id');
        $this->postJson("/api/client-admin/projects/$p->id/members", ['admin_id' => $staffId, 'can_manage' => false, 'can_review' => false], $admin)->assertOk();
        $this->getJson("/api/client-admin/projects/$p->id", $staff)->assertOk();
        $this->postJson("/api/client-admin/projects/$p->id/requirements", [], $staff)->assertForbidden();
        for ($i = 0; $i < 2; $i++) $this->postJson("/api/portal/projects/$p->id/products", ['name' => 'Item '.$i, 'status' => 'draft', 'stock' => 0], $headers)->assertOk();
        $this->postJson("/api/portal/projects/$p->id/products", ['name' => 'Overflow', 'status' => 'draft', 'stock' => 0], $headers)->assertUnprocessable();
        $this->postJson("/api/client-admin/projects/$p->id/requirements", ['title' => 'Contact email', 'field_type' => 'email', 'required' => true], $admin)->assertOk();
        $req = DB::table('client_requirements')->value('id');
        $this->postJson("/api/portal/projects/$p->id/content/$req", ['value' => 'bad', 'status' => 'submitted'], $headers)->assertUnprocessable();
        $this->postJson("/api/portal/projects/$p->id/content/$req", ['value' => 'client@example.com', 'status' => 'submitted'], $headers)->assertOk();
        DB::table('users')->where('id', $user)->update(['portal_active' => false]);
        $this->getJson('/api/portal/overview', $headers)->assertUnauthorized();
    }
}
