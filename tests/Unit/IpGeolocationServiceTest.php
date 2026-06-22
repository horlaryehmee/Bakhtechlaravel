<?php

namespace Tests\Unit;

use App\Services\IpGeolocationService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IpGeolocationServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config()->set('services.ip_geolocation.enabled', true);
        config()->set('services.ip_geolocation.url', 'https://geo.example.test/{ip}');
    }

    public function test_it_resolves_and_caches_a_public_ip_location(): void
    {
        Http::fake([
            'geo.example.test/*' => Http::response([
                'success' => true,
                'country' => 'Nigeria',
                'city' => 'Lagos',
            ]),
        ]);

        $service = app(IpGeolocationService::class);

        $this->assertSame(['country' => 'Nigeria', 'city' => 'Lagos'], $service->locate('8.8.8.8'));
        $this->assertSame(['country' => 'Nigeria', 'city' => 'Lagos'], $service->locate('8.8.8.8'));
        Http::assertSentCount(1);
    }

    public function test_it_does_not_send_private_ips_to_the_provider(): void
    {
        Http::fake();

        $this->assertSame(
            ['country' => null, 'city' => null],
            app(IpGeolocationService::class)->locate('127.0.0.1'),
        );
        Http::assertNothingSent();
    }

    public function test_provider_failures_do_not_break_tracking(): void
    {
        Http::fake(['geo.example.test/*' => Http::response([], 503)]);

        $this->assertSame(
            ['country' => null, 'city' => null],
            app(IpGeolocationService::class)->locate('1.1.1.1'),
        );
    }
}
