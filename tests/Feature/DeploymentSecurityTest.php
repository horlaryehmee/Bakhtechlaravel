<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DeploymentSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_tokens_use_cached_configuration_secret(): void
    {
        config()->set('security.admin_token_secret', 'test-configured-admin-token-secret');

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'security@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Security Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        $token = AdminToken::make($admin);

        $this->assertSame($adminId, AdminToken::admin($token)?->id);

        config()->set('security.admin_token_secret', 'different-secret');
        $this->assertNull(AdminToken::admin($token));
    }

    public function test_media_upload_rejects_executable_files(): void
    {
        config()->set('security.admin_token_secret', 'test-upload-secret');
        $adminId = DB::table('admins')->insertGetId([
            'email' => 'uploads@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Upload Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->post('/api/admin/media', [
                'file' => UploadedFile::fake()->create('shell.php', 1, 'application/x-httpd-php'),
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('file');
    }

    public function test_signed_paystack_webhook_reconciles_payment_once(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'gateway_mode'],
            ['value' => 'test', 'created_at' => now(), 'updated_at' => now()],
        );
        DB::table('settings')->updateOrInsert(
            ['key' => 'paystack_secret_test'],
            ['value' => 'sk_test_webhook_secret', 'created_at' => now(), 'updated_at' => now()],
        );

        $clientId = DB::table('invoice_clients')->insertGetId([
            'name' => 'Payment Client',
            'email' => 'payer@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $documentId = DB::table('invoice_documents')->insertGetId([
            'client_id' => $clientId,
            'type' => 'invoice',
            'number' => 'INV-SECURITY-001',
            'title' => 'Security Invoice',
            'public_token' => 'security-payment-token',
            'status' => 'sent',
            'currency' => 'NGN',
            'exchange_rate' => 1,
            'subtotal' => 1000,
            'discount_total' => 0,
            'tax_total' => 0,
            'total' => 1000,
            'amount_paid' => 0,
            'balance_due' => 1000,
            'issue_date' => now()->toDateString(),
            'payment_gateway' => 'paystack',
            'payment_enabled' => true,
            'partial_payment_enabled' => true,
            'branding_json' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            'api.paystack.co/transaction/initialize' => Http::response([
                'status' => true,
                'data' => [
                    'authorization_url' => 'https://checkout.paystack.test/authorize',
                    'access_code' => 'access-code',
                ],
            ]),
        ]);

        $payment = $this->postJson('/api/invoices/security-payment-token/payments/initialize', [
            'amount' => 500,
        ])->assertOk()->json('payment');

        $payload = [
            'event' => 'charge.success',
            'data' => [
                'reference' => $payment['reference'],
                'amount' => 50000,
                'currency' => 'NGN',
                'status' => 'success',
            ],
        ];
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac('sha512', $body, 'sk_test_webhook_secret');

        $sendWebhook = fn () => $this->call(
            'POST',
            '/api/invoices/payments/paystack/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_PAYSTACK_SIGNATURE' => $signature,
            ],
            $body,
        );

        $sendWebhook()->assertOk()->assertJson(['ok' => true, 'processed' => true]);
        $sendWebhook()->assertOk()->assertJson(['ok' => true, 'processed' => true]);

        $this->assertDatabaseHas('invoice_payments', [
            'document_id' => $documentId,
            'reference' => $payment['reference'],
            'status' => 'paid',
            'amount' => 500,
        ]);
        $this->assertDatabaseHas('invoice_documents', [
            'id' => $documentId,
            'status' => 'partial',
            'amount_paid' => 500,
            'balance_due' => 500,
        ]);
        $this->assertSame(1, DB::table('invoice_events')
            ->where('document_id', $documentId)
            ->where('event_type', 'payment.completed')
            ->count());
    }

    public function test_unsigned_paystack_webhook_is_rejected(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'paystack_secret_test'],
            ['value' => 'sk_test_webhook_secret', 'created_at' => now(), 'updated_at' => now()],
        );

        $this->postJson('/api/invoices/payments/paystack/webhook', [
            'event' => 'charge.success',
            'data' => [],
        ])->assertUnauthorized();
    }

    public function test_public_settings_never_expose_secrets(): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => 'paystack_secret_live'],
            ['value' => 'sk_live_private', 'created_at' => now(), 'updated_at' => now()],
        );
        DB::table('settings')->updateOrInsert(
            ['key' => 'google_business_client_secret'],
            ['value' => 'google-private', 'created_at' => now(), 'updated_at' => now()],
        );

        $settings = $this->getJson('/api/settings')->assertOk()->json('settings');

        $this->assertArrayNotHasKey('paystack_secret_live', $settings);
        $this->assertArrayNotHasKey('google_business_client_secret', $settings);
        $this->assertArrayHasKey('siteName', $settings);
    }

    public function test_health_endpoint_checks_the_database_connection(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJson([
                'ok' => true,
                'database' => 'connected',
            ]);
    }

    public function test_only_published_cms_pages_are_public(): void
    {
        DB::table('pages')->insert([
            [
                'title' => 'Published page',
                'slug' => 'published-page',
                'content' => 'Database-backed content',
                'status' => 'published',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Draft page',
                'slug' => 'draft-page',
                'content' => 'Private draft',
                'status' => 'draft',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $this->getJson('/api/pages/published-page')
            ->assertOk()
            ->assertJsonPath('page.content', 'Database-backed content');

        $this->getJson('/api/pages/draft-page')->assertNotFound();
    }

    public function test_database_repair_adds_missing_baseline_without_overwriting_content(): void
    {
        DB::table('pages')->insert([
            'title' => 'About',
            'slug' => 'about',
            'content' => 'Keep this custom content.',
            'status' => 'published',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->artisan('database:check', ['--repair' => true])->assertSuccessful();

        $this->assertDatabaseHas('pages', [
            'slug' => 'about',
            'content' => 'Keep this custom content.',
        ]);
        $this->assertDatabaseHas('pages', ['slug' => 'home']);
        $this->assertDatabaseHas('settings', [
            'key' => 'siteName',
            'value' => 'Bakhtech Solutions',
        ]);
        $this->assertDatabaseHas('review_sources', ['provider' => 'google']);
        $this->assertSame(1, DB::table('admins')->count());
    }

    public function test_invoice_json_import_accepts_common_shapes_and_generates_numbers(): void
    {
        config()->set('security.admin_token_secret', 'test-invoice-import-secret');
        $adminId = DB::table('admins')->insertGetId([
            'email' => 'invoice-import@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Invoice Import Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        $response = $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->postJson('/api/admin/invoices/import/json', [
                'data' => [
                    'invoices' => [[
                        'title' => 'Imported invoice',
                        'client' => [
                            'name' => 'Invoice Client',
                            'email' => 'invoice-client@example.test',
                        ],
                        'lineItems' => [[
                            'name' => 'Website build',
                            'quantity' => 2,
                            'unitPrice' => 1500,
                        ]],
                    ]],
                    'quotes' => [[
                        'title' => 'Imported quote',
                        'clientName' => 'Quote Client',
                        'clientEmail' => 'quote-client@example.test',
                        'total' => 4500,
                    ]],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('imported', 2);

        $this->assertDatabaseHas('invoice_documents', [
            'type' => 'invoice',
            'title' => 'Imported invoice',
            'total' => 3000,
        ]);
        $this->assertDatabaseHas('invoice_documents', [
            'type' => 'quote',
            'title' => 'Imported quote',
            'total' => 4500,
        ]);
        $this->assertSame(2, DB::table('invoice_documents')
            ->whereIn('title', ['Imported invoice', 'Imported quote'])
            ->whereNotNull('number')
            ->count());
        $importedInvoiceId = DB::table('invoice_documents')->where('title', 'Imported invoice')->value('id');
        $this->assertSame(1, DB::table('invoice_document_items')->where('document_id', $importedInvoiceId)->count());
        $this->assertSame(2, $response->json('summary.documents'));
    }

    public function test_invoice_json_import_rejects_files_without_documents(): void
    {
        config()->set('security.admin_token_secret', 'test-empty-import-secret');
        $adminId = DB::table('admins')->insertGetId([
            'email' => 'empty-import@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Empty Import Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->postJson('/api/admin/invoices/import/json', ['unrelated' => []])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'No invoice or quote records were found in the JSON file.');
    }
}
