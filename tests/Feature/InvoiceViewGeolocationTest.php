<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InvoiceViewGeolocationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_public_document_view_records_ip_geolocation(): void
    {
        config()->set('services.ip_geolocation.enabled', true);
        config()->set('services.ip_geolocation.url', 'https://geo.example.test/{ip}');
        Http::fake([
            'geo.example.test/*' => Http::response([
                'success' => true,
                'country' => 'Nigeria',
                'city' => 'Abuja',
            ]),
        ]);

        $documentId = DB::table('invoice_documents')->insertGetId([
            'type' => 'quote',
            'number' => 'QT-GEO-001',
            'public_token' => 'geo-view-token',
            'status' => 'sent',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->withServerVariables(['REMOTE_ADDR' => '8.8.8.8'])
            ->withHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0) Chrome/125.0')
            ->postJson('/api/invoices/geo-view-token/events', [
                'eventType' => 'document.viewed',
                'sessionId' => 'geo-session',
            ])
            ->assertNoContent();

        $this->assertDatabaseHas('invoice_events', [
            'document_id' => $documentId,
            'event_type' => 'document.viewed',
            'ip_address' => '8.8.8.8',
            'country' => 'Nigeria',
            'city' => 'Abuja',
        ]);
    }
}
