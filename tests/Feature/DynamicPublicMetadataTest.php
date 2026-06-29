<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DynamicPublicMetadataTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_page_returns_document_specific_private_metadata(): void
    {
        config()->set('app.url', 'https://example.test');

        DB::table('invoice_documents')->insert([
            'type' => 'invoice',
            'number' => 'INV-META-001',
            'public_token' => 'meta-invoice-token',
            'status' => 'sent',
            'currency' => 'NGN',
            'total' => 150000,
            'balance_due' => 125000,
            'branding_json' => json_encode(['businessName' => 'Acme Studio']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->get('/invoice/meta-invoice-token')
            ->assertOk()
            ->assertSee('<title>INV-META-001</title>', false)
            ->assertSee('Your invoice is ready. Kindly review it and complete your payment securely.', false)
            ->assertSee('Invoice INV-META-001 from Acme Studio', false)
            ->assertSee('content="noindex, nofollow, noarchive"', false)
            ->assertSee('href="https://example.test/invoice/meta-invoice-token"', false);

        $this->assertStringContainsString('private', (string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertStringNotContainsString('client@example.test', $response->getContent());
    }

    public function test_booking_calendar_page_returns_calendar_specific_metadata(): void
    {
        config()->set('app.url', 'https://example.test');

        DB::table('booking_calendars')->insert([
            'name' => 'Website Discovery Call',
            'slug' => 'website-discovery',
            'description' => 'Choose a convenient time to discuss your website requirements and project goals.',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->get('/book/website-discovery')
            ->assertOk()
            ->assertSee('<title>Website Discovery Call</title>', false)
            ->assertSee('Book Website Discovery Call with Bakhtech Solutions', false)
            ->assertSee('Choose a convenient time to discuss your website requirements and project goals.', false)
            ->assertSee('href="https://example.test/book/website-discovery"', false);
    }
}
