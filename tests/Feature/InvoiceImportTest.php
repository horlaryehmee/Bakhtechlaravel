<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\InvoiceController;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InvoiceImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_imports_wordpress_invoicepay_export_tables_into_admin_invoice_tables(): void
    {
        $request = Request::create('/api/admin/invoices/import/json', 'POST', [
            'tables' => [
                'bk_quotes' => [
                    [
                        'id' => 99,
                        'quote_number' => 'WP-QT-001',
                        'type' => 'quote',
                        'client_name' => 'WordPress Client',
                        'client_email' => 'client@example.test',
                        'client_phone' => '+2347000000000',
                        'client_company' => 'Client Co',
                        'client_address' => 'Lagos',
                        'issue_date' => '2026-06-01',
                        'valid_until' => '2026-06-30',
                        'status' => 'sent',
                        'subtotal' => '100000.00',
                        'tax_total' => '7500.00',
                        'discount_total' => '0.00',
                        'total_amount' => '107500.00',
                        'amount_paid' => '0.00',
                        'currency' => 'NGN',
                        'public_token' => 'wordpress-public-token',
                        'client_token' => 'wordpress-client-token',
                        'service_overview' => 'This package includes one page.',
                        'scope_of_service' => '1. Page Design &amp; Layout <ul><li>Design a responsive page</li><li>Structure service sections</li></ul>',
                    ],
                ],
                'bk_line_items' => [
                    [
                        'quote_id' => 99,
                        'sort_order' => 1,
                        'name' => 'Website design',
                        'description' => 'Imported WordPress line item',
                        'quantity' => '1',
                        'unit_price' => '100000.00',
                        'tax_rate' => '7.50',
                        'line_total' => '107500.00',
                    ],
                ],
                'bk_payments' => [
                    [
                        'id' => 10,
                        'quote_id' => 99,
                        'gateway' => 'manual',
                        'amount' => '25000.00',
                        'currency' => 'NGN',
                        'reference' => 'WP-PAY-001',
                        'status' => 'completed',
                        'txn_payload' => 'a:2:{s:6:"status";s:7:"success";s:9:"reference";s:10:"WP-PAY-001";}',
                        'created_at' => '2026-06-02 12:00:00',
                    ],
                ],
            ],
        ]);

        $response = app(InvoiceController::class)->importFromJSON($request);

        $this->assertSame(1, $response['imported']);
        $this->assertDatabaseHas('invoice_documents', [
            'number' => 'WP-QT-001',
            'type' => 'quote',
            'status' => 'sent',
            'total' => 107500,
            'amount_paid' => 0,
            'balance_due' => 107500,
            'legacy_client_token' => 'wordpress-client-token',
        ]);
        $this->assertDatabaseHas('invoice_clients', [
            'email' => 'client@example.test',
            'name' => 'WordPress Client',
        ]);
        $this->assertDatabaseHas('invoice_document_items', [
            'name' => 'Website design',
            'line_total' => 107500,
        ]);
        $this->assertDatabaseHas('invoice_payments', [
            'reference' => 'WP-PAY-001',
            'amount' => 25000,
            'status' => 'completed',
        ]);
        $paymentPayload = DB::table('invoice_payments')->where('reference', 'WP-PAY-001')->value('gateway_response_json');
        $this->assertSame(
            'a:2:{s:6:"status";s:7:"success";s:9:"reference";s:10:"WP-PAY-001";}',
            json_decode($paymentPayload, true, 512, JSON_THROW_ON_ERROR)['legacyPayload']
        );

        $documentId = DB::table('invoice_documents')->where('number', 'WP-QT-001')->value('id');
        $this->assertNotNull($documentId);

        $publicResponse = app(InvoiceController::class)->publicDocument(
            Request::create('/api/invoices/wordpress-client-token', 'GET'),
            'wordpress-client-token'
        );

        $this->assertSame('WP-QT-001', $publicResponse['document']['number']);
        $this->assertSame('This package includes one page.', $publicResponse['document']['serviceOverview']);
        $this->assertSame('1. Page Design & Layout <ul><li>Design a responsive page</li><li>Structure service sections</li></ul>', $publicResponse['document']['scopeOfService']);
        $this->assertSame('', $publicResponse['document']['notes']);
        $this->assertSame('', $publicResponse['document']['terms']);
    }

    public function test_old_wordpress_frontend_invoice_links_redirect_to_new_invoice_route(): void
    {
        $this->get('/?view_invoice=wordpress-client-token')
            ->assertRedirect('/invoice/wordpress-client-token');

        $this->get('/?view_quote=wordpress-client-token')
            ->assertRedirect('/invoice/wordpress-client-token');

        $this->get('/?view_receipt=wordpress-client-token&download=pdf')
            ->assertRedirect('/api/invoices/wordpress-client-token/pdf');
    }

    public function test_it_exports_invoice_data_in_importable_json_table_shape(): void
    {
        $clientId = DB::table('invoice_clients')->insertGetId([
            'name' => 'Export Client',
            'email' => 'export@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $documentId = DB::table('invoice_documents')->insertGetId([
            'client_id' => $clientId,
            'type' => 'invoice',
            'number' => 'INV-EXPORT-001',
            'title' => 'Exportable Invoice',
            'public_token' => 'export-token',
            'status' => 'sent',
            'currency' => 'NGN',
            'exchange_rate' => 1,
            'subtotal' => 100000,
            'discount_total' => 0,
            'tax_total' => 7500,
            'total' => 107500,
            'amount_paid' => 25000,
            'balance_due' => 82500,
            'issue_date' => now()->toDateString(),
            'payment_enabled' => true,
            'payment_gateway' => 'paystack',
            'branding_json' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('invoice_document_items')->insert([
            'document_id' => $documentId,
            'name' => 'Exported service',
            'quantity' => 1,
            'unit_price' => 100000,
            'discount_rate' => 0,
            'tax_rate' => 7.5,
            'line_total' => 107500,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('invoice_payments')->insert([
            'document_id' => $documentId,
            'gateway' => 'manual',
            'reference' => 'EXPORT-PAY-001',
            'amount' => 25000,
            'currency' => 'NGN',
            'status' => 'completed',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = app(InvoiceController::class)->exportToJSON();
        $payload = $response->getData(true);
        $exportedDocument = collect($payload['tables']['bk_quotes'])->firstWhere('quote_number', 'INV-EXPORT-001');
        $exportedItem = collect($payload['tables']['bk_line_items'])->firstWhere('quote_id', $documentId);
        $exportedPayment = collect($payload['tables']['bk_payments'])->firstWhere('quote_id', $documentId);

        $this->assertSame('bakhtech-laravel', $payload['source']);
        $this->assertSame('INV-EXPORT-001', $exportedDocument['quote_number']);
        $this->assertSame('Exported service', $exportedItem['name']);
        $this->assertSame('EXPORT-PAY-001', $exportedPayment['reference']);
    }

    public function test_public_quote_can_generate_invoice_and_download_pdf(): void
    {
        $clientId = DB::table('invoice_clients')->insertGetId([
            'name' => 'Quote Client',
            'email' => 'quote-client@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $quoteId = DB::table('invoice_documents')->insertGetId([
            'client_id' => $clientId,
            'type' => 'quote',
            'number' => 'QT-GEN-001',
            'title' => 'Interactive Quote',
            'public_token' => 'quote-generate-token',
            'status' => 'sent',
            'currency' => 'NGN',
            'exchange_rate' => 1,
            'subtotal' => 100000,
            'discount_total' => 0,
            'tax_total' => 7500,
            'total' => 107500,
            'amount_paid' => 0,
            'balance_due' => 107500,
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(7)->toDateString(),
            'payment_enabled' => false,
            'branding_json' => json_encode(['businessName' => 'Bakhtech Solutions', 'primaryColor' => '#ef4444', 'accentColor' => '#12c8a0']),
            'notes' => 'Quote overview',
            'terms' => '<ul><li>Approved scope</li></ul>',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('invoice_document_items')->insert([
            'document_id' => $quoteId,
            'name' => 'Website package',
            'description' => 'Build and launch',
            'quantity' => 1,
            'unit_price' => 100000,
            'discount_rate' => 0,
            'tax_rate' => 7.5,
            'line_total' => 107500,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->postJson('/api/invoices/quote-generate-token/generate-invoice')
            ->assertCreated()
            ->json();

        $this->assertSame('invoice', $response['document']['type']);
        $this->assertStringStartsWith('/invoice/', $response['document']['publicUrl']);
        $this->assertDatabaseHas('invoice_documents', [
            'type' => 'invoice',
            'source_quote_id' => $quoteId,
            'total' => 107500,
        ]);
        $this->assertDatabaseHas('invoice_documents', [
            'id' => $quoteId,
            'status' => 'accepted',
        ]);

        $this->get('/api/invoices/quote-generate-token/pdf')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }
}
