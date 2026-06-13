<?php

namespace Tests\Feature;

use App\Services\GoogleCalendarOAuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleCalendarOAuthServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_uses_primary_calendar_when_calendar_list_is_empty(): void
    {
        $this->googleSetting('google_calendar_access_token', 'access-token');
        $this->googleSetting('google_calendar_token_expires_at', now()->addHour()->toIso8601String());
        $this->googleSetting('google_connected_email', 'owner@example.test');

        Http::fake([
            'https://www.googleapis.com/calendar/v3/users/me/calendarList' => Http::response(['items' => []]),
            'https://www.googleapis.com/calendar/v3/calendars/primary' => Http::response([
                'id' => 'owner@example.test',
                'summary' => 'Owner calendar',
            ]),
        ]);

        $result = app(GoogleCalendarOAuthService::class)->calendarList();

        $this->assertNull($result['message']);
        $this->assertFalse($result['needsReconnect']);
        $this->assertSame('owner@example.test', $result['calendars'][0]['id']);
        $this->assertTrue($result['calendars'][0]['primary']);
    }

    public function test_it_returns_google_calendar_api_error_instead_of_an_empty_list(): void
    {
        $this->googleSetting('google_calendar_access_token', 'access-token');
        $this->googleSetting('google_calendar_token_expires_at', now()->addHour()->toIso8601String());

        Http::fake([
            'https://www.googleapis.com/calendar/v3/users/me/calendarList' => Http::response([
                'error' => ['message' => 'Google Calendar API has not been used in project 123 before or it is disabled.'],
            ], 403),
        ]);

        $result = app(GoogleCalendarOAuthService::class)->calendarList();

        $this->assertSame([], $result['calendars']);
        $this->assertTrue($result['needsReconnect']);
        $this->assertStringContainsString('Calendar API', $result['message']);
    }

    private function googleSetting(string $key, string $value): void
    {
        DB::table('booking_settings')->updateOrInsert(
            ['key' => $key],
            ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
        );
    }
}
