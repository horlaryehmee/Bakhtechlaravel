<?php

namespace Tests\Feature;

use App\Support\AdminToken;
use App\Services\SiteIncidentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class DeploymentSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_attempt_limit_is_isolated_per_invoice(): void
    {
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $this->postJson('/api/invoices/rate-limit-invoice-a/payments/initialize', [
                'amount' => 100,
            ])->assertNotFound();
        }

        $this->postJson('/api/invoices/rate-limit-invoice-b/payments/initialize', [
            'amount' => 100,
        ])->assertNotFound();

        $this->postJson('/api/invoices/rate-limit-invoice-a/payments/initialize', [
            'amount' => 100,
        ])->assertTooManyRequests()
            ->assertJsonPath('message', 'Too many payment attempts for this invoice. Please wait a minute and try again.');
    }

    public function test_flutterwave_payment_uses_secret_saved_by_invoice_settings(): void
    {
        DB::table('settings')->insert([
            ['key' => 'gateway_mode', 'value' => 'test', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'flutter_secret_test', 'value' => 'FLWSECK_TEST_configured', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $clientId = DB::table('invoice_clients')->insertGetId([
            'name' => 'Flutterwave Client',
            'email' => 'flutterwave@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('invoice_documents')->insert([
            'client_id' => $clientId,
            'type' => 'invoice',
            'number' => 'INV-FLUTTERWAVE-001',
            'title' => 'Flutterwave Invoice',
            'public_token' => 'flutterwave-payment-token',
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
            'payment_gateway' => 'flutterwave',
            'payment_enabled' => true,
            'partial_payment_enabled' => true,
            'branding_json' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            'api.flutterwave.com/v3/payments' => Http::sequence()
                ->push([
                    'status' => 'success',
                    'data' => ['link' => 'https://checkout.flutterwave.test/pay'],
                ])
                ->push([
                    'status' => 'error',
                    'message' => 'Live account is not activated',
                ], 401),
        ]);

        $this->postJson('/api/invoices/flutterwave-payment-token/payments/initialize', [
            'amount' => 1000,
        ])->assertOk()
            ->assertJsonPath('payment.gateway', 'flutterwave')
            ->assertJsonPath('payment.authorizationUrl', 'https://checkout.flutterwave.test/pay');

        Http::assertSent(fn ($request) => $request->url() === 'https://api.flutterwave.com/v3/payments'
            && $request->hasHeader('Authorization', 'Bearer FLWSECK_TEST_configured'));

        DB::table('settings')->where('key', 'gateway_mode')->update(['value' => 'live']);
        DB::table('settings')->insert([
            'key' => 'flutter_secret_live',
            'value' => 'FLWSECK_LIVE_configured',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->postJson('/api/invoices/flutterwave-payment-token/payments/initialize', [
            'amount' => 1000,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'Flutterwave rejected the live payment request: Live account is not activated');

        Http::assertSent(fn ($request) => $request->url() === 'https://api.flutterwave.com/v3/payments'
            && $request->hasHeader('Authorization', 'Bearer FLWSECK_LIVE_configured'));
    }

    public function test_apache_routes_legacy_invoice_links_through_laravel(): void
    {
        $legacyQueryRule = '(view_invoice|view_quote|view_receipt|bkinv_receipt_pdf)';

        $this->assertStringContainsString($legacyQueryRule, file_get_contents(base_path('.htaccess')));
        $this->assertStringContainsString('RewriteRule ^ public/index.php [L]', file_get_contents(base_path('.htaccess')));
        $this->assertStringContainsString($legacyQueryRule, file_get_contents(public_path('.htaccess')));
        $this->assertStringContainsString('RewriteRule ^ index.php [L]', file_get_contents(public_path('.htaccess')));
    }

    public function test_apache_routes_api_requests_through_laravel_before_spa_fallback(): void
    {
        $rootHtaccess = file_get_contents(base_path('.htaccess'));
        $publicHtaccess = file_get_contents(public_path('.htaccess'));
        $apiHtaccess = file_get_contents(base_path('api/.htaccess'));

        $this->assertStringContainsString('RewriteRule ^(api|admin|invoice|receipt|booking|book)(/.*)?$ public/index.php [L]', $rootHtaccess);
        $this->assertStringContainsString('RewriteRule ^ public/index.html [L]', $rootHtaccess);
        $this->assertLessThan(
            strpos($rootHtaccess, 'RewriteRule ^ public/index.html [L]'),
            strpos($rootHtaccess, 'RewriteRule ^(api|admin|invoice|receipt|booking|book)(/.*)?$ public/index.php [L]')
        );

        $this->assertStringContainsString('RewriteRule ^(api|admin|invoice|receipt|booking|book)(/.*)?$ index.php [L]', $publicHtaccess);
        $this->assertStringContainsString('RewriteRule ^ index.html [L]', $publicHtaccess);
        $this->assertLessThan(
            strpos($publicHtaccess, 'RewriteRule ^ index.html [L]'),
            strpos($publicHtaccess, 'RewriteRule ^(api|admin|invoice|receipt|booking|book)(/.*)?$ index.php [L]')
        );

        $this->assertStringContainsString('DirectoryIndex index.php', $apiHtaccess);
        $this->assertStringContainsString('RewriteRule ^.*$ index.php [L]', $apiHtaccess);
        $this->assertStringNotContainsString('../public/index.php', $apiHtaccess);

        $apiFrontController = file_get_contents(base_path('api/index.php'));
        $this->assertStringContainsString('$_SERVER[\'SCRIPT_NAME\'] = \'/index.php\';', $apiFrontController);
        $this->assertStringContainsString('$_SERVER[\'PHP_SELF\'] = \'/index.php\';', $apiFrontController);
        $this->assertStringContainsString('$_SERVER[\'SCRIPT_FILENAME\'] = __DIR__.\'/../public/index.php\';', $apiFrontController);
    }

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

    public function test_admin_me_tolerates_legacy_admin_profile_columns(): void
    {
        config()->set('security.admin_token_secret', 'legacy-admin-profile-secret');

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'legacy-admin@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Legacy Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();
        $token = AdminToken::make($admin);

        if (Schema::hasColumn('admins', 'two_factor_enabled')) {
            Schema::table('admins', fn ($table) => $table->dropColumn('two_factor_enabled'));
        }
        if (Schema::hasColumn('admins', 'two_factor_secret')) {
            Schema::table('admins', fn ($table) => $table->dropColumn('two_factor_secret'));
        }

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/me')
            ->assertOk()
            ->assertJsonPath('admin.email', 'legacy-admin@example.test')
            ->assertJsonPath('admin.twoFactorEnabled', false);
    }

    public function test_admin_dashboard_tolerates_legacy_analytics_columns(): void
    {
        Cache::store('file')->forget('admin:dashboard:summary:v3');
        config()->set('security.admin_token_secret', 'legacy-dashboard-secret');

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'legacy-dashboard@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Legacy Dashboard Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();
        $token = AdminToken::make($admin);

        if (Schema::hasColumn('visits', 'created_at')) {
            Schema::table('visits', function ($table) {
                $table->dropIndex(['visitor_id', 'created_at']);
                $table->dropIndex(['country', 'created_at']);
                $table->dropIndex(['source_type', 'created_at']);
                $table->dropIndex('visits_dashboard_created_at_index');
                $table->dropColumn('created_at');
            });
        }

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('totals.todayVisits', 0)
            ->assertJsonPath('analytics.migrationRequired', true);
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
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        Mail::fake();

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
        $this->postJson('/api/invoices/security-payment-token/events', [
            'eventType' => 'document.viewed',
            'sessionId' => 'payment-refresh-session',
        ])->assertNoContent();
        $this->getJson('/api/invoices/security-payment-token')
            ->assertOk()
            ->assertJsonPath('document.status', 'partial')
            ->assertJsonPath('document.amountPaid', 500)
            ->assertJsonPath('document.balanceDue', 500);
        $this->getJson('/api/invoices/security-payment-token/receipt?reference=' . urlencode($payment['reference']))
            ->assertOk()
            ->assertJsonPath('receipt.reference', $payment['reference'])
            ->assertJsonPath('receipt.amount', 500);
        $this->get('/api/invoices/security-payment-token/receipt/pdf?reference=' . urlencode($payment['reference']))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('content-disposition', 'attachment; filename="receipt-' . strtolower($payment['reference']) . '.pdf"');
        $this->assertDatabaseCount('invoice_email_logs', 1);
        $this->assertDatabaseHas('invoice_email_logs', [
            'document_id' => $documentId,
            'template_key' => 'payment_received',
            'status' => 'sent',
        ]);
        $paymentEmailHtml = (string) DB::table('invoice_email_logs')
            ->where('document_id', $documentId)
            ->where('template_key', 'payment_received')
            ->value('body_html');
        $this->assertStringContainsString('View receipt', $paymentEmailHtml);
        $this->assertStringContainsString('/receipt/security-payment-token?reference=', $paymentEmailHtml);
        $this->assertStringContainsString('/api/invoices/security-payment-token/receipt/pdf?reference=', $paymentEmailHtml);
        $this->assertSame(1, DB::table('invoice_events')
            ->where('document_id', $documentId)
            ->where('event_type', 'payment.completed')
            ->count());

        $finalPayment = $this->postJson('/api/invoices/security-payment-token/payments/initialize', [
            'amount' => 500,
        ])->assertOk()->json('payment');
        $finalPayload = [
            'event' => 'charge.success',
            'data' => [
                'reference' => $finalPayment['reference'],
                'amount' => 50000,
                'currency' => 'NGN',
                'status' => 'success',
            ],
        ];
        $finalBody = json_encode($finalPayload, JSON_UNESCAPED_SLASHES);
        $finalSignature = hash_hmac('sha512', $finalBody, 'sk_test_webhook_secret');

        $this->call(
            'POST',
            '/api/invoices/payments/paystack/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_PAYSTACK_SIGNATURE' => $finalSignature,
            ],
            $finalBody,
        )->assertOk()->assertJson(['ok' => true, 'processed' => true]);

        $this->getJson('/api/invoices/security-payment-token')
            ->assertOk()
            ->assertJsonPath('document.status', 'paid')
            ->assertJsonPath('document.amountPaid', 1000)
            ->assertJsonPath('document.balanceDue', 0);
        $this->postJson('/api/invoices/security-payment-token/payments/initialize', [
            'amount' => 1,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'This invoice has already been paid in full.');
        $this->assertSame(2, DB::table('invoice_email_logs')
            ->where('document_id', $documentId)
            ->where('template_key', 'payment_received')
            ->count());
    }

    public function test_invoice_due_date_defaults_to_thirty_days_after_issue_date(): void
    {
        Mail::fake();
        config()->set('security.admin_token_secret', 'invoice-due-date-secret');

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'invoice-admin@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Invoice Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        $response = $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->postJson('/api/admin/invoices/documents', [
                'type' => 'invoice',
                'title' => 'Thirty day invoice',
                'currency' => 'NGN',
                'issueDate' => '2026-06-01',
                'paymentGateway' => 'paystack',
                'paymentEnabled' => true,
                'client' => [
                    'name' => 'Due Date Client',
                    'email' => 'due-date@example.test',
                ],
                'items' => [[
                    'name' => 'Professional Service',
                    'quantity' => 1,
                    'unitPrice' => 1000,
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('document.dueDate', '2026-07-01');

        $this->assertDatabaseHas('invoice_documents', [
            'id' => $response->json('document.id'),
            'issue_date' => '2026-06-01',
            'due_date' => '2026-07-01',
        ]);
    }

    public function test_invoice_creation_skips_existing_generated_numbers(): void
    {
        Mail::fake();
        config()->set('security.admin_token_secret', 'invoice-number-secret');

        DB::table('settings')->insert([
            'key' => 'starting_number',
            'value' => '1000',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'invoice-number-admin@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Invoice Number Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        DB::table('invoice_documents')->insert([
            'type' => 'invoice',
            'number' => 'INV-1002',
            'title' => 'Existing Invoice',
            'public_token' => 'existing-invoice-number-token',
            'status' => 'draft',
            'currency' => 'NGN',
            'exchange_rate' => 1,
            'subtotal' => 1000,
            'discount_total' => 0,
            'tax_total' => 0,
            'total' => 1000,
            'amount_paid' => 0,
            'balance_due' => 1000,
            'issue_date' => '2026-06-01',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->postJson('/api/admin/invoices/documents', [
                'type' => 'invoice',
                'title' => 'Next generated invoice',
                'currency' => 'NGN',
                'issueDate' => '2026-06-02',
                'paymentGateway' => 'paystack',
                'paymentEnabled' => true,
                'client' => [
                    'name' => 'Number Client',
                    'email' => 'number-client@example.test',
                ],
                'items' => [[
                    'name' => 'Professional Service',
                    'quantity' => 1,
                    'unitPrice' => 1000,
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('document.number', 'INV-1003');

        $this->assertDatabaseHas('invoice_documents', [
            'title' => 'Next generated invoice',
            'number' => 'INV-1003',
        ]);
    }

    public function test_manual_payment_sends_payment_specific_receipt_email(): void
    {
        Mail::fake();
        config()->set('security.admin_token_secret', 'manual-payment-secret');

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'manual-payment-admin@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Manual Payment Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();
        $clientId = DB::table('invoice_clients')->insertGetId([
            'name' => 'Manual Payment Client',
            'email' => 'manual-payer@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $documentId = DB::table('invoice_documents')->insertGetId([
            'client_id' => $clientId,
            'type' => 'invoice',
            'number' => 'INV-MANUAL-001',
            'title' => 'Manual Payment Invoice',
            'public_token' => 'manual-payment-token',
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
            'payment_enabled' => true,
            'branding_json' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->postJson("/api/admin/invoices/documents/{$documentId}/payments", [
                'amount' => 400,
                'method' => 'bank transfer',
                'date' => now()->toDateString(),
                'notes' => 'Deposit received',
            ])
            ->assertOk()
            ->assertJsonPath('document.status', 'partial')
            ->assertJsonPath('document.amountPaid', 400);

        $payment = DB::table('invoice_payments')->where('document_id', $documentId)->first();
        $this->assertNotNull($payment);
        $this->assertDatabaseHas('invoice_email_logs', [
            'document_id' => $documentId,
            'template_key' => 'payment_received',
            'status' => 'sent',
        ]);
        $emailHtml = (string) DB::table('invoice_email_logs')->where('document_id', $documentId)->value('body_html');
        $this->assertStringContainsString('₦400', $emailHtml);
        $this->assertStringContainsString('/receipt/manual-payment-token?reference=' . $payment->reference, $emailHtml);
        $this->assertStringContainsString('/receipt/pdf?reference=' . $payment->reference, $emailHtml);
        $this->getJson('/api/invoices/manual-payment-token/receipt?reference=' . $payment->reference)
            ->assertOk()
            ->assertJsonPath('receipt.amount', 400)
            ->assertJsonPath('receipt.gateway', 'bank transfer');
    }

    public function test_marking_invoice_paid_records_settlement_and_notifies_client(): void
    {
        Mail::fake();
        config()->set('security.admin_token_secret', 'status-paid-secret');

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'status-paid-admin@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Status Paid Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();
        $clientId = DB::table('invoice_clients')->insertGetId([
            'name' => 'Settlement Client',
            'email' => 'settled@example.test',
            'company_name' => 'Settlement Ltd',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $documentId = DB::table('invoice_documents')->insertGetId([
            'client_id' => $clientId,
            'type' => 'invoice',
            'number' => 'INV-SETTLED-001',
            'title' => 'Settlement Invoice',
            'public_token' => 'settlement-token',
            'status' => 'sent',
            'currency' => 'NGN',
            'exchange_rate' => 1,
            'subtotal' => 250000,
            'discount_total' => 0,
            'tax_total' => 0,
            'total' => 250000,
            'amount_paid' => 0,
            'balance_due' => 250000,
            'issue_date' => '2026-06-30',
            'due_date' => '2026-07-30',
            'payment_enabled' => true,
            'branding_json' => json_encode([]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('invoice_document_items')->insert([
            'document_id' => $documentId,
            'name' => 'Website project',
            'description' => '',
            'quantity' => 1,
            'unit_price' => 250000,
            'discount_rate' => 0,
            'tax_rate' => 0,
            'line_total' => 250000,
            'sort_order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('invoice_payments')->insert([
            'document_id' => $documentId,
            'gateway' => 'manual',
            'reference' => 'ZERO-LEGACY-PAYMENT',
            'amount' => 0,
            'currency' => 'NGN',
            'status' => 'paid',
            'paid_at' => now()->subDay(),
            'created_at' => now()->subDay(),
            'updated_at' => now()->subDay(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->putJson("/api/admin/invoices/documents/{$documentId}", [
                'type' => 'invoice',
                'number' => 'INV-SETTLED-001',
                'title' => 'Settlement Invoice',
                'status' => 'paid',
                'currency' => 'NGN',
                'issueDate' => '2026-06-30',
                'dueDate' => '2026-07-30',
                'paymentGateway' => 'manual',
                'paymentEnabled' => true,
                'partialPaymentEnabled' => true,
                'serviceOverview' => '',
                'scopeOfService' => '',
                'notes' => '',
                'terms' => '',
                'branding' => [],
                'client' => [
                    'id' => $clientId,
                    'name' => 'Settlement Client',
                    'email' => 'settled@example.test',
                    'phone' => '',
                    'companyName' => 'Settlement Ltd',
                    'address' => '',
                ],
                'items' => [[
                    'name' => 'Website project',
                    'description' => '',
                    'quantity' => 1,
                    'unitPrice' => 250000,
                    'discountRate' => 0,
                    'taxRate' => 0,
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('document.status', 'paid')
            ->assertJsonPath('document.amountPaid', 250000)
            ->assertJsonPath('document.balanceDue', 0);

        $payment = DB::table('invoice_payments')->where('document_id', $documentId)->where('amount', '>', 0)->first();
        $this->assertNotNull($payment);
        $this->assertSame(250000.0, (float) $payment->amount);

        $emailHtml = (string) DB::table('invoice_email_logs')
            ->where('document_id', $documentId)
            ->where('template_key', 'payment_settled')
            ->value('body_html');

        $this->assertStringContainsString('Invoice fully settled', $emailHtml);
        $this->assertStringContainsString('₦250,000', $emailHtml);
        $this->assertStringNotContainsString('>₦0<', $emailHtml);
        $this->assertStringContainsString('/receipt/settlement-token?reference=' . $payment->reference, $emailHtml);
    }

    public function test_payment_return_verifies_paystack_and_refreshes_invoice_once(): void
    {
        Mail::fake();
        DB::table('settings')->updateOrInsert(
            ['key' => 'gateway_mode'],
            ['value' => 'test', 'created_at' => now(), 'updated_at' => now()],
        );
        DB::table('settings')->updateOrInsert(
            ['key' => 'paystack_secret_test'],
            ['value' => 'sk_test_return_secret', 'created_at' => now(), 'updated_at' => now()],
        );

        $clientId = DB::table('invoice_clients')->insertGetId([
            'name' => 'Return Client',
            'email' => 'return@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $documentId = DB::table('invoice_documents')->insertGetId([
            'client_id' => $clientId,
            'type' => 'invoice',
            'number' => 'INV-RETURN-001',
            'title' => 'Return Invoice',
            'public_token' => 'return-payment-token',
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
        DB::table('invoice_payments')->insert([
            'document_id' => $documentId,
            'gateway' => 'paystack',
            'reference' => 'PAYSTACK-RETURN-001',
            'amount' => 1000,
            'currency' => 'NGN',
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            'api.paystack.co/transaction/verify/*' => Http::response([
                'status' => true,
                'data' => [
                    'reference' => 'PAYSTACK-RETURN-001',
                    'amount' => 100000,
                    'currency' => 'NGN',
                    'status' => 'success',
                ],
            ]),
        ]);

        $verify = fn () => $this->postJson('/api/invoices/return-payment-token/payments/verify', [
            'reference' => 'PAYSTACK-RETURN-001',
        ]);

        $verify()
            ->assertOk()
            ->assertJsonPath('processed', true)
            ->assertJsonPath('document.status', 'paid')
            ->assertJsonPath('document.amountPaid', 1000)
            ->assertJsonPath('document.balanceDue', 0);
        $verify()
            ->assertOk()
            ->assertJsonPath('document.status', 'paid');

        $this->assertDatabaseHas('invoice_payments', [
            'document_id' => $documentId,
            'reference' => 'PAYSTACK-RETURN-001',
            'status' => 'paid',
        ]);
        $this->assertSame(1, DB::table('invoice_email_logs')
            ->where('document_id', $documentId)
            ->where('template_key', 'payment_received')
            ->count());
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

    public function test_public_index_includes_homepage_social_preview_image(): void
    {
        $html = file_get_contents(public_path('index.html'));

        $this->assertFileExists(public_path('social-preview.png'));
        $this->assertStringContainsString('property="og:image" content="https://bakhtech.com.ng/social-preview.png"', $html);
        $this->assertStringContainsString('property="og:image:width" content="1910"', $html);
        $this->assertStringContainsString('property="og:image:height" content="915"', $html);
        $this->assertStringContainsString('name="twitter:image" content="https://bakhtech.com.ng/social-preview.png"', $html);
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

    public function test_readiness_endpoint_checks_required_source_classes(): void
    {
        $this->getJson('/api/ready')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('service', 'bakhtech-api')
            ->assertJsonStructure(['release'])
            ->assertJsonPath('checks.4.key', 'source')
            ->assertJsonPath('checks.4.ok', true);
    }

    public function test_incident_warnings_do_not_send_alert_email(): void
    {
        Mail::fake();

        DB::table('settings')->insert([
            'key' => 'adminEmail',
            'value' => 'alerts@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(SiteIncidentService::class)->report([
            'severity' => 'warning',
            'type' => 'slow_request',
            'source' => 'request-diagnostics',
            'message' => 'Slow request: GET /api/settings took 7000ms',
            'url' => 'https://bakhtech.com.ng/api/settings',
        ]);

        $this->assertDatabaseHas('site_incidents', [
            'severity' => 'warning',
            'type' => 'slow_request',
            'source' => 'request-diagnostics',
            'message' => 'Slow request: GET /api/settings took 7000ms',
        ]);
        Mail::assertNothingSent();
    }

    public function test_smtp_transport_incidents_do_not_send_alert_email(): void
    {
        Mail::fake();

        DB::table('settings')->insert([
            'key' => 'adminEmail',
            'value' => 'alerts@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(SiteIncidentService::class)->report([
            'severity' => 'error',
            'type' => 'TransportException',
            'source' => 'exception-handler',
            'message' => 'Failed to authenticate on SMTP server.',
            'url' => 'https://bakhtech.com.ng/api/admin/invoices/documents',
        ]);

        $this->assertDatabaseHas('site_incidents', [
            'severity' => 'error',
            'type' => 'TransportException',
            'source' => 'exception-handler',
            'message' => 'Failed to authenticate on SMTP server.',
        ]);
        Mail::assertNothingSent();
    }

    public function test_fixed_source_incidents_are_auto_resolved_when_loaded(): void
    {
        config()->set('security.admin_token_secret', 'incident-auto-resolve-secret');

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'incident-auto@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Incident Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        DB::table('site_incidents')->insert([
            'fingerprint' => hash('sha256', 'missing-controller'),
            'severity' => 'error',
            'type' => 'BindingResolutionException',
            'source' => 'exception-handler',
            'message' => 'Target class [App\Http\Controllers\Api\BakhtechApiController] does not exist.',
            'url' => 'https://bakhtech.com.ng/api/reviews',
            'method' => 'GET',
            'status' => 'open',
            'occurrence_count' => 3,
            'first_seen_at' => now()->subHour(),
            'last_seen_at' => now()->subHour(),
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->getJson('/api/admin/incidents?status=resolved')
            ->assertOk()
            ->assertJsonPath('summary.open', 0)
            ->assertJsonPath('summary.resolved', 1)
            ->assertJsonPath('incidents.0.status', 'resolved');
    }

    public function test_admin_can_clear_one_or_all_incident_reports(): void
    {
        config()->set('security.admin_token_secret', 'incident-clear-secret');

        $adminId = DB::table('admins')->insertGetId([
            'email' => 'incident-clear@example.test',
            'password_hash' => bcrypt('password'),
            'name' => 'Incident Admin',
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $admin = DB::table('admins')->where('id', $adminId)->first();

        $firstId = DB::table('site_incidents')->insertGetId([
            'fingerprint' => hash('sha256', 'first-clearable'),
            'severity' => 'warning',
            'type' => 'slow_request',
            'source' => 'request-diagnostics',
            'message' => 'Slow request: GET /api/settings took 7000ms',
            'url' => 'https://bakhtech.com.ng/api/settings',
            'method' => 'GET',
            'status' => 'open',
            'occurrence_count' => 1,
            'first_seen_at' => now(),
            'last_seen_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('site_incidents')->insert([
            'fingerprint' => hash('sha256', 'second-clearable'),
            'severity' => 'error',
            'type' => 'frontend_api_failure',
            'source' => 'admin-frontend',
            'message' => 'Request failed. (500)',
            'url' => '/api/admin/dashboard',
            'method' => 'GET',
            'status' => 'open',
            'occurrence_count' => 1,
            'first_seen_at' => now(),
            'last_seen_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->deleteJson("/api/admin/incidents/{$firstId}")
            ->assertOk()
            ->assertJsonPath('deleted', 1);

        $this->assertDatabaseMissing('site_incidents', ['id' => $firstId]);

        $this->withHeader('Authorization', 'Bearer '.AdminToken::make($admin))
            ->postJson('/api/admin/incidents/clear')
            ->assertOk()
            ->assertJsonPath('deleted', 1);

        $this->assertDatabaseCount('site_incidents', 0);
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
        DB::table('pages')->updateOrInsert(
            ['slug' => 'about'],
            [
                'title' => 'About',
                'content' => 'Keep this custom content.',
                'status' => 'published',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );

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
