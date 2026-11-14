<?php
namespace Tests\Feature;
use App\Services\PaidInvoiceClientService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PaidInvoiceClientTest extends TestCase
{
    use RefreshDatabase;
    private function invoice(string $status = 'partial', float $paid = 20): int
    {
        $client = DB::table('invoice_clients')->insertGetId(['name' => 'Paying Client', 'email' => 'payer@example.com', 'company_name' => 'Client Co']);
        return DB::table('invoice_documents')->insertGetId(['client_id' => $client, 'type' => 'invoice', 'number' => 'TEST-'.uniqid(), 'public_token' => bin2hex(random_bytes(20)), 'status' => $status, 'total' => 100, 'amount_paid' => $paid, 'balance_due' => 100-$paid]);
    }
    public function test_part_payment_links_existing_crm_and_queues_exactly_one_invitation(): void
    {
        $crm = DB::table('crm_contacts')->insertGetId(['email' => 'payer@example.com', 'name' => 'Original CRM Name', 'stage' => 'proposal', 'notes' => 'Preserve this']);
        $invoice = $this->invoice(); $service = app(PaidInvoiceClientService::class);
        $id = $service->sync($invoice);
        $this->assertNotNull($id);
        $this->assertSame($id, $service->sync($invoice));
        $this->assertSame($id, $service->sync($this->invoice('paid', 100)));
        $this->assertDatabaseHas('users', ['id' => $id, 'crm_contact_id' => $crm, 'portal_active' => true, 'portal_password_set' => false]);
        $this->assertDatabaseHas('crm_contacts', ['id' => $crm, 'stage' => 'won', 'name' => 'Original CRM Name', 'notes' => 'Preserve this']);
        $this->assertDatabaseCount('portal_invitation_mail', 1);
        $this->assertDatabaseCount('portal_invitations', 1);
    }
    public function test_unpaid_cancelled_quotes_and_missing_email_do_not_qualify(): void
    {
        $service = app(PaidInvoiceClientService::class);
        $this->assertNull($service->sync($this->invoice('sent', 0)));
        $this->assertNull($service->sync($this->invoice('cancelled', 20)));
        $id = $this->invoice(); DB::table('invoice_documents')->where('id', $id)->update(['type' => 'quote']);
        $this->assertNull($service->sync($id));
        $id = $this->invoice(); DB::table('invoice_clients')->update(['email' => null]);
        $this->assertNull($service->sync($id));
        $this->assertDatabaseCount('portal_invitation_mail', 0);
    }
    public function test_existing_password_and_deactivation_are_preserved(): void
    {
        $hash = Hash::make('Existing-password-123');
        $user = DB::table('users')->insertGetId(['name' => 'Existing Client', 'email' => 'payer@example.com', 'password' => $hash, 'portal_active' => false, 'portal_password_set' => true]);
        $this->assertSame($user, app(PaidInvoiceClientService::class)->sync($this->invoice()));
        $this->assertDatabaseHas('users', ['id' => $user, 'password' => $hash, 'portal_active' => false, 'portal_password_set' => true]);
        $this->assertDatabaseCount('portal_invitation_mail', 0);
    }
}
