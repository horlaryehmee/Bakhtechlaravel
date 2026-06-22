<?php

namespace Tests\Unit;

use App\Services\VisitorAnalyticsService;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class VisitorAnalyticsFallbackTest extends TestCase
{
    public function test_dashboard_remains_available_before_analytics_migration_runs(): void
    {
        Schema::shouldReceive('hasTable')->andReturn(false);

        $analytics = app(VisitorAnalyticsService::class)->dashboard('month');

        $this->assertTrue($analytics['migrationRequired']);
        $this->assertSame(0, $analytics['liveVisitors']);
        $this->assertSame([], $analytics['liveSessions']);
    }
}
