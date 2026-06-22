<?php

namespace Tests\Feature;

use App\Services\VisitorAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VisitorAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_pageviews_heartbeats_and_visitor_dimensions_are_real(): void
    {
        config()->set('services.ip_geolocation.enabled', true);
        config()->set('services.ip_geolocation.url', 'https://geo.example.test/{ip}');
        Http::fake([
            'geo.example.test/*' => Http::response(['success' => true, 'country' => 'Nigeria', 'city' => 'Lagos']),
        ]);

        $server = ['REMOTE_ADDR' => '8.8.8.8'];
        $headers = ['User-Agent' => 'Mozilla/5.0 (Linux; Android 14) Chrome/125.0 Mobile'];
        $identity = ['visitorId' => 'visitor-1', 'sessionId' => 'session-1'];

        $this->withServerVariables($server)->withHeaders($headers)->postJson('/api/visits', [
            ...$identity,
            'eventType' => 'pageview',
            'path' => '/pricing',
            'referrer' => 'https://www.facebook.com/some-campaign',
            'language' => 'en-NG',
            'screenWidth' => 390,
            'screenHeight' => 844,
        ])->assertNoContent();

        $this->withServerVariables($server)->withHeaders($headers)->postJson('/api/visits', [
            ...$identity,
            'eventType' => 'heartbeat',
            'path' => '/pricing',
            'durationSeconds' => 45,
        ])->assertNoContent();

        $this->assertDatabaseHas('visits', [
            'visitor_id' => 'visitor-1',
            'session_id' => 'session-1',
            'path' => '/pricing',
            'source' => 'Facebook',
            'source_type' => 'social',
            'country' => 'Nigeria',
            'city' => 'Lagos',
            'device_type' => 'mobile',
            'browser' => 'Chrome',
            'duration_seconds' => 45,
        ]);

        $analytics = app(VisitorAnalyticsService::class)->dashboard(30);
        $this->assertSame(1, $analytics['liveVisitors']);
        $this->assertSame(1, $analytics['visitors']);
        $this->assertSame(1, $analytics['sessions']);
        $this->assertSame(1, $analytics['pageViews']);
        $this->assertSame(45, $analytics['averageDurationSeconds']);
        $this->assertSame(0.0, $analytics['bounceRate']);
        $this->assertSame('Facebook', $analytics['sources'][0]['name']);
    }
}
