<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class InvoiceEmailTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_pixel_records_each_open_with_available_device_and_location_data(): void
    {
        $documentId = DB::table('invoice_documents')->insertGetId([
            'number' => 'INV-TRACK-001',
            'public_token' => 'invoice-email-tracking-document',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $logId = DB::table('invoice_email_logs')->insertGetId([
            'document_id' => $documentId,
            'recipient_email' => 'client@example.test',
            'subject' => 'Tracked invoice',
            'status' => 'sent',
            'open_token' => 'tracked-open-token',
            'click_token' => 'tracked-click-token',
            'sent_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $headers = [
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
            'X-Vercel-IP-Country' => 'NG',
            'X-Vercel-IP-City' => 'Lagos',
        ];

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->withHeaders($headers)
            ->get('/api/invoices/email/open/tracked-open-token')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/gif');

        $firstOpenedAt = DB::table('invoice_email_logs')->where('id', $logId)->value('opened_at');
        $this->assertNotNull($firstOpenedAt);
        $this->assertDatabaseHas('invoice_email_open_events', [
            'email_log_id' => $logId,
            'document_id' => $documentId,
            'ip_address' => '203.0.113.10',
            'device_type' => 'desktop',
            'browser' => 'Chrome',
            'operating_system' => 'Windows',
            'country' => 'NG',
            'city' => 'Lagos',
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.11'])
            ->withHeaders($headers)
            ->get('/api/invoices/email/open/tracked-open-token')
            ->assertOk();

        $this->assertSame(2, DB::table('invoice_email_open_events')->where('email_log_id', $logId)->count());
        $this->assertSame((string) $firstOpenedAt, (string) DB::table('invoice_email_logs')->where('id', $logId)->value('opened_at'));
        $this->assertSame(1, DB::table('invoice_events')->where('document_id', $documentId)->where('event_type', 'email.opened')->count());
    }
}
