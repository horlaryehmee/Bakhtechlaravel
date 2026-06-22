<?php

namespace Tests\Feature;

use App\Services\VisitorAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

        $analytics = app(VisitorAnalyticsService::class)->dashboard('month');
        $this->assertSame(1, $analytics['liveVisitors']);
        $this->assertSame(1, $analytics['visitors']);
        $this->assertSame(1, $analytics['sessions']);
        $this->assertSame(1, $analytics['pageViews']);
        $this->assertSame(45, $analytics['averageDurationSeconds']);
        $this->assertSame(0.0, $analytics['bounceRate']);
        $this->assertSame('Facebook', $analytics['sources'][0]['name']);
        $this->assertSame('day', $analytics['trendInterval']);
        $this->assertCount(30, $analytics['trend']);
        $this->assertSame(1, $analytics['visitorTotals']['week']);
        $this->assertSame(1, $analytics['visitorTotals']['month']);
        $this->assertSame(1, $analytics['visitorTotals']['year']);

        $custom = app(VisitorAnalyticsService::class)->dashboard('custom', now()->toDateString(), now()->toDateString());
        $this->assertSame('custom', $custom['range']);
        $this->assertSame(1, $custom['visitors']);
        $this->assertCount(1, $custom['trend']);

        $year = app(VisitorAnalyticsService::class)->dashboard('year');
        $this->assertSame('month', $year['trendInterval']);
        $this->assertCount(12, $year['trend']);
    }

    public function test_instagram_in_app_visits_are_live_even_without_a_referrer(): void
    {
        config()->set('services.ip_geolocation.enabled', false);

        $this->withServerVariables(['REMOTE_ADDR' => '8.8.4.4'])
            ->withHeader('User-Agent', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile Instagram 330.0.0.0')
            ->postJson('/api/visits', [
                'visitorId' => 'instagram-visitor',
                'sessionId' => 'instagram-session',
                'eventType' => 'pageview',
                'path' => '/?igsh=abc123',
                'referrer' => '',
            ])
            ->assertNoContent();

        $this->assertDatabaseHas('visits', [
            'visitor_id' => 'instagram-visitor',
            'session_id' => 'instagram-session',
            'source' => 'Instagram',
            'source_type' => 'social',
        ]);

        $analytics = app(VisitorAnalyticsService::class)->dashboard('week');
        $this->assertSame(1, $analytics['liveVisitors']);
        $this->assertSame('Instagram', $analytics['liveSessions'][0]['source']);
    }

    public function test_utm_source_attributes_instagram_campaign_links(): void
    {
        config()->set('services.ip_geolocation.enabled', false);

        $this->postJson('/api/visits', [
            'visitorId' => 'campaign-visitor',
            'sessionId' => 'campaign-session',
            'eventType' => 'pageview',
            'path' => '/pricing?utm_source=instagram&utm_campaign=bio',
            'referrer' => '',
        ])->assertNoContent();

        $this->assertDatabaseHas('visits', ['source' => 'Instagram', 'source_type' => 'campaign']);
    }

    public function test_persisted_source_hint_survives_a_stripped_referrer(): void
    {
        config()->set('services.ip_geolocation.enabled', false);

        $this->postJson('/api/visits', [
            'visitorId' => 'google-visitor',
            'sessionId' => 'google-session',
            'eventType' => 'pageview',
            'path' => '/contact',
            'sourceHint' => 'Google',
            'referrer' => '',
        ])->assertNoContent();

        $this->assertDatabaseHas('visits', ['source' => 'Google', 'source_type' => 'search']);
    }

    public function test_existing_direct_rows_are_reclassified_when_evidence_exists(): void
    {
        DB::table('visits')->insert([
            'visitor_id' => 'old-instagram-visitor',
            'session_id' => 'old-instagram-session',
            'path' => '/',
            'referrer' => '',
            'source' => 'Direct',
            'source_type' => 'direct',
            'user_agent' => 'Mozilla/5.0 Mobile Instagram 330.0.0.0',
            'ip' => '8.8.8.8',
            'duration_seconds' => 0,
            'last_seen_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        app(VisitorAnalyticsService::class)->dashboard('month');

        $this->assertDatabaseHas('visits', ['session_id' => 'old-instagram-session', 'source' => 'Instagram', 'source_type' => 'social']);
    }

    public function test_bots_are_excluded_from_live_and_human_analytics(): void
    {
        DB::table('visits')->insert([
            'visitor_id' => 'scanner',
            'session_id' => 'scanner-session',
            'path' => '/items/Y153422056/',
            'referrer' => '',
            'source' => 'Direct',
            'source_type' => 'direct',
            'user_agent' => 'Mozilla/5.0 Chrome/125.0 crawler bot',
            'ip' => '8.8.8.8',
            'device_type' => 'bot',
            'browser' => 'Chrome',
            'duration_seconds' => 0,
            'last_seen_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $analytics = app(VisitorAnalyticsService::class)->dashboard('week');

        $this->assertSame(0, $analytics['liveVisitors']);
        $this->assertSame(0, $analytics['visitors']);
        $this->assertSame(0, $analytics['sessions']);
        $this->assertSame(0, $analytics['pageViews']);
        $this->assertSame(1, $analytics['excludedBotPageViews']);
        $this->assertSame([], $analytics['liveSessions']);
    }
}
