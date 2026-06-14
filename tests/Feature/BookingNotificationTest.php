<?php

namespace Tests\Feature;

use App\Services\BookingNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BookingNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_each_booking_notifies_attendee_and_admin_and_schedules_multiple_reminders(): void
    {
        foreach ([
            'admin_alert_email' => 'admin@example.test',
            'confirmation_email_subject' => 'Booking confirmed',
            'reminder_email_subject' => 'Booking reminder',
        ] as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $calendarId = DB::table('booking_calendars')->insertGetId([
            'name' => 'Consultations',
            'slug' => 'consultations',
            'description' => '',
            'timezone' => 'Africa/Lagos',
            'color' => '#1261ff',
            'settings_json' => json_encode([
                'email' => [
                    'reminderMinutesBefore' => [1440, 60, 30],
                    'confirmationTemplate' => 'Confirmed for {{name}} at {{time}}.',
                    'adminTemplate' => 'New booking from {{name}} at {{time}}.',
                    'reminderTemplate' => 'Reminder for {{name}} at {{time}}.',
                ],
            ]),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $eventTypeId = DB::table('booking_event_types')->insertGetId([
            'booking_calendar_id' => $calendarId,
            'name' => 'Discovery Call',
            'slug' => 'notification-test-discovery-call',
            'description' => '',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'location_type' => 'google_meet',
            'location_label' => 'Google Meet',
            'timezone' => 'Africa/Lagos',
            'availability_json' => '{}',
            'min_notice_hours' => 0,
            'max_future_days' => 30,
            'reminder_minutes_before' => 60,
            'price_amount' => 0,
            'currency' => 'NGN',
            'payment_required' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $service = app(BookingNotificationService::class);

        foreach ([
            ['days' => 2, 'type' => 'google_meet', 'value' => 'https://meet.example.test/test'],
            ['days' => 3, 'type' => 'whatsapp', 'value' => '+234 800 123 4567'],
        ] as $bookingDetails) {
            $daysAhead = $bookingDetails['days'];
            $start = now('Africa/Lagos')->addDays($daysAhead)->startOfHour();
            $bookingId = DB::table('bookings')->insertGetId([
                'booking_event_type_id' => $eventTypeId,
                'booking_calendar_id' => $calendarId,
                'name' => 'Repeat Client',
                'email' => 'client@example.test',
                'phone' => '1234',
                'service' => 'Discovery Call',
                'message' => '',
                'status' => 'confirmed',
                'scheduled_at' => $start->toDateTimeString(),
                'timezone' => 'Africa/Lagos',
                'attendee_timezone' => 'Africa/Lagos',
                'starts_at' => $start->toDateTimeString(),
                'ends_at' => $start->copy()->addMinutes(30)->toDateTimeString(),
                'duration_minutes' => 30,
                'price_amount' => 0,
                'currency' => 'NGN',
                'payment_status' => 'not_required',
                'location_type' => $bookingDetails['type'],
                'location_value' => $bookingDetails['value'],
                'google_calendar_sync_status' => 'not_configured',
                'cancel_token' => fake()->uuid(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $service->bookingCreated($bookingId);
        }

        $this->assertSame(4, DB::table('email_logs')->count());
        $confirmationEmails = DB::table('email_logs')
            ->where('source', 'booking-confirmation')
            ->orderBy('id')
            ->get();
        $this->assertStringContainsString('Your booking is confirmed', $confirmationEmails[0]->body_html);
        $this->assertStringContainsString('Appointment details', $confirmationEmails[0]->body_html);
        $this->assertStringContainsString('Join Google Meet', $confirmationEmails[0]->body_html);
        $this->assertStringContainsString('https://meet.example.test/test', $confirmationEmails[0]->body_html);
        $this->assertStringContainsString('Open WhatsApp', $confirmationEmails[1]->body_html);
        $this->assertStringContainsString('https://wa.me/2348001234567', $confirmationEmails[1]->body_html);
        $this->assertStringContainsString('Repeat Client', $confirmationEmails[1]->body_html);
        $this->assertDatabaseCount('booking_reminders', 12);
        $this->assertDatabaseHas('booking_reminders', [
            'recipient_email' => 'client@example.test',
            'minutes_before' => 30,
            'status' => 'pending',
        ]);
        $this->assertDatabaseHas('booking_reminders', [
            'recipient_email' => 'admin@example.test',
            'minutes_before' => 1440,
            'status' => 'pending',
        ]);

        DB::table('booking_reminders')->update(['scheduled_for' => now()->subMinute()]);
        $result = $service->sendDueReminders();

        $this->assertSame(12, $result['sent']);
        $this->assertSame(0, $result['failed']);
        $this->assertSame(16, DB::table('email_logs')->count());
        $this->assertDatabaseMissing('booking_reminders', ['status' => 'pending']);
        $this->assertStringContainsString(
            'Your meeting is coming up',
            DB::table('email_logs')->where('source', 'booking-reminder')->value('body_html')
        );
    }

    public function test_public_booking_generates_google_meet_link_and_includes_it_in_confirmation_email(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15 09:00:00', 'Africa/Lagos'));

        foreach ([
            'admin_alert_email' => 'admin@example.test',
            'google_calendar_sync_enabled' => 'true',
            'google_calendar_id' => 'team-calendar@example.test',
            'google_calendar_access_token' => 'google-access-token',
            'google_calendar_token_expires_at' => now()->addHour()->toIso8601String(),
            'google_calendar_send_updates' => 'all',
            'google_meet_auto_generate' => 'true',
        ] as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $calendarId = DB::table('booking_calendars')->insertGetId([
            'name' => 'Consultations',
            'slug' => 'google-meet-consultations',
            'description' => '',
            'timezone' => 'Africa/Lagos',
            'color' => '#1261ff',
            'settings_json' => '{}',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $eventTypeId = DB::table('booking_event_types')->insertGetId([
            'booking_calendar_id' => $calendarId,
            'name' => 'Google Meet Call',
            'slug' => 'google-meet-call',
            'description' => '',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'location_type' => 'google_meet',
            'location_label' => 'Google Meet',
            'timezone' => 'Africa/Lagos',
            'availability_json' => json_encode(['wednesday' => [['start' => '10:00', 'end' => '11:00']]]),
            'min_notice_hours' => 0,
            'max_future_days' => 30,
            'reminder_minutes_before' => 60,
            'price_amount' => 0,
            'currency' => 'NGN',
            'payment_required' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            'https://www.googleapis.com/calendar/v3/calendars/*/events*' => Http::response([
                'id' => 'google-event-123',
                'htmlLink' => 'https://calendar.google.com/event?eid=123',
                'hangoutLink' => 'https://meet.google.com/abc-defg-hij',
                'conferenceData' => [
                    'entryPoints' => [
                        ['entryPointType' => 'video', 'uri' => 'https://meet.google.com/abc-defg-hij'],
                    ],
                ],
            ], 200),
        ]);

        $response = $this->postJson('/api/booking/bookings', [
            'eventTypeId' => $eventTypeId,
            'startsAt' => '2026-06-17T10:00:00+01:00',
            'timezone' => 'Africa/Lagos',
            'name' => 'Meet Client',
            'email' => 'meet-client@example.test',
            'phone' => '08000000000',
            'message' => 'See you online.',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('booking.locationType', 'google_meet')
            ->assertJsonPath('booking.locationValue', 'https://meet.google.com/abc-defg-hij')
            ->assertJsonPath('booking.googleCalendarSyncStatus', 'synced');

        $this->assertDatabaseHas('bookings', [
            'email' => 'meet-client@example.test',
            'location_value' => 'https://meet.google.com/abc-defg-hij',
            'google_calendar_event_id' => 'google-event-123',
        ]);

        $confirmation = DB::table('email_logs')
            ->where('source', 'booking-confirmation')
            ->where('recipient', 'meet-client@example.test')
            ->first();

        $this->assertNotNull($confirmation);
        $this->assertStringContainsString('Join Google Meet', $confirmation->body_html);
        $this->assertStringContainsString('https://meet.google.com/abc-defg-hij', $confirmation->body_html);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), rawurlencode('team-calendar@example.test'))
                && str_starts_with($request['start']['dateTime'], '2026-06-17T10:00:00+01:00')
                && ! isset($request['conferenceData']['createRequest']['conferenceSolutionKey'])
                && ! empty($request['conferenceData']['createRequest']['requestId']);
        });

        Carbon::setTestNow();
    }

    public function test_public_booking_waits_for_pending_google_meet_link_before_sending_email(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15 09:00:00', 'Africa/Lagos'));

        foreach ([
            'admin_alert_email' => 'admin@example.test',
            'google_calendar_sync_enabled' => 'true',
            'google_calendar_id' => 'team-calendar@example.test',
            'google_calendar_access_token' => 'google-access-token',
            'google_calendar_token_expires_at' => now()->addHour()->toIso8601String(),
            'google_meet_auto_generate' => 'true',
        ] as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $calendarId = DB::table('booking_calendars')->insertGetId([
            'name' => 'Pending Meet Calendar',
            'slug' => 'pending-meet-calendar',
            'description' => '',
            'timezone' => 'Africa/Lagos',
            'color' => '#1261ff',
            'settings_json' => '{}',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $eventTypeId = DB::table('booking_event_types')->insertGetId([
            'booking_calendar_id' => $calendarId,
            'name' => 'Pending Meet Call',
            'slug' => 'pending-meet-call',
            'description' => '',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'location_type' => 'google_meet',
            'location_label' => 'Google Meet',
            'timezone' => 'Africa/Lagos',
            'availability_json' => json_encode(['wednesday' => [['start' => '10:00', 'end' => '11:00']]]),
            'min_notice_hours' => 0,
            'max_future_days' => 30,
            'reminder_minutes_before' => 60,
            'price_amount' => 0,
            'currency' => 'NGN',
            'payment_required' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $eventFetches = 0;
        Http::fake(function ($request) use (&$eventFetches) {
            if ($request->method() === 'POST') {
                return Http::response([
                    'id' => 'pending-event-123',
                    'htmlLink' => 'https://calendar.google.com/event?eid=pending',
                    'conferenceData' => [
                        'createRequest' => ['status' => ['statusCode' => 'pending']],
                    ],
                ]);
            }

            $eventFetches++;

            return Http::response([
                'id' => 'pending-event-123',
                'hangoutLink' => 'https://meet.google.com/pending-ready-link',
            ]);
        });

        $response = $this->postJson('/api/booking/bookings', [
            'eventTypeId' => $eventTypeId,
            'startsAt' => '2026-06-17T10:00:00+01:00',
            'timezone' => 'Africa/Lagos',
            'name' => 'Pending Meet Client',
            'email' => 'pending-meet@example.test',
            'phone' => '08000000000',
            'message' => '',
            'meetingPlatform' => 'google-meet',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('booking.locationValue', 'https://meet.google.com/pending-ready-link')
            ->assertJsonPath('booking.googleCalendarSyncStatus', 'synced');

        $this->assertSame(1, $eventFetches);
        $this->assertStringContainsString(
            'https://meet.google.com/pending-ready-link',
            DB::table('email_logs')
                ->where('source', 'booking-confirmation')
                ->where('recipient', 'pending-meet@example.test')
                ->value('body_html')
        );

        Carbon::setTestNow();
    }

    public function test_google_conference_id_is_saved_and_rendered_as_a_meet_link(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15 09:00:00', 'Africa/Lagos'));

        foreach ([
            'admin_alert_email' => 'admin@example.test',
            'google_calendar_sync_enabled' => 'true',
            'google_calendar_id' => 'team-calendar@example.test',
            'google_calendar_access_token' => 'google-access-token',
            'google_calendar_token_expires_at' => now()->addHour()->toIso8601String(),
            'google_meet_auto_generate' => 'true',
        ] as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $eventTypeId = DB::table('booking_event_types')->insertGetId([
            'name' => 'Conference ID Call',
            'slug' => 'conference-id-call',
            'description' => '',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'location_type' => 'google-meet',
            'location_label' => 'Google Meet',
            'timezone' => 'Africa/Lagos',
            'availability_json' => json_encode(['wednesday' => [['start' => '10:00', 'end' => '11:00']]]),
            'min_notice_hours' => 0,
            'max_future_days' => 30,
            'reminder_minutes_before' => 60,
            'price_amount' => 0,
            'currency' => 'NGN',
            'payment_required' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            'https://www.googleapis.com/calendar/v3/calendars/*/events*' => Http::response([
                'id' => 'conference-id-event',
                'htmlLink' => 'https://calendar.google.com/event?eid=conference-id',
                'conferenceData' => ['conferenceId' => 'abc-defg-hij'],
            ]),
        ]);

        $response = $this->postJson('/api/booking/bookings', [
            'eventTypeId' => $eventTypeId,
            'startsAt' => '2026-06-17T10:00:00+01:00',
            'timezone' => 'Africa/Lagos',
            'name' => 'Conference Client',
            'email' => 'conference-client@example.test',
            'phone' => '',
            'message' => '',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('booking.locationType', 'google_meet')
            ->assertJsonPath('booking.locationValue', 'https://meet.google.com/abc-defg-hij');

        $this->assertStringContainsString(
            'Join Google Meet',
            DB::table('email_logs')
                ->where('source', 'booking-confirmation')
                ->where('recipient', 'conference-client@example.test')
                ->value('body_html')
        );

        Carbon::setTestNow();
    }

    public function test_google_calendar_failure_is_returned_with_the_booking(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15 09:00:00', 'Africa/Lagos'));

        foreach ([
            'google_calendar_sync_enabled' => 'true',
            'google_calendar_id' => 'readonly@example.test',
            'google_calendar_access_token' => 'google-access-token',
            'google_calendar_token_expires_at' => now()->addHour()->toIso8601String(),
        ] as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $eventTypeId = DB::table('booking_event_types')->insertGetId([
            'name' => 'Failed Meet Call',
            'slug' => 'failed-meet-call',
            'description' => '',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'location_type' => 'google_meet',
            'location_label' => 'Google Meet',
            'timezone' => 'Africa/Lagos',
            'availability_json' => json_encode(['wednesday' => [['start' => '10:00', 'end' => '11:00']]]),
            'min_notice_hours' => 0,
            'max_future_days' => 30,
            'reminder_minutes_before' => 60,
            'price_amount' => 0,
            'currency' => 'NGN',
            'payment_required' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake([
            'https://www.googleapis.com/calendar/v3/calendars/*/events*' => Http::response([
                'error' => ['message' => 'You need to have writer access to this calendar.'],
            ], 403),
        ]);

        $response = $this->postJson('/api/booking/bookings', [
            'eventTypeId' => $eventTypeId,
            'startsAt' => '2026-06-17T10:00:00+01:00',
            'timezone' => 'Africa/Lagos',
            'name' => 'Failed Meet Client',
            'email' => 'failed-meet@example.test',
            'phone' => '',
            'message' => '',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('booking.googleCalendarSyncStatus', 'failed')
            ->assertJsonPath('booking.googleCalendarSyncError', 'You need to have writer access to this calendar.');

        $this->assertDatabaseHas('bookings', [
            'email' => 'failed-meet@example.test',
            'google_calendar_sync_error' => 'You need to have writer access to this calendar.',
        ]);

        Carbon::setTestNow();
    }

    public function test_google_meet_retries_on_primary_calendar_when_selected_calendar_rejects_event(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15 09:00:00', 'Africa/Lagos'));

        foreach ([
            'admin_alert_email' => 'admin@example.test',
            'google_calendar_sync_enabled' => 'true',
            'google_calendar_id' => 'family@example.test',
            'google_calendar_access_token' => 'google-access-token',
            'google_calendar_token_expires_at' => now()->addHour()->toIso8601String(),
            'google_meet_auto_generate' => 'true',
        ] as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $eventTypeId = DB::table('booking_event_types')->insertGetId([
            'name' => 'Primary Fallback Call',
            'slug' => 'primary-fallback-call',
            'description' => '',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'location_type' => 'google_meet',
            'location_label' => 'Google Meet',
            'timezone' => 'Africa/Lagos',
            'availability_json' => json_encode(['wednesday' => [['start' => '10:00', 'end' => '11:00']]]),
            'min_notice_hours' => 0,
            'max_future_days' => 30,
            'reminder_minutes_before' => 60,
            'price_amount' => 0,
            'currency' => 'NGN',
            'payment_required' => false,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Http::fake(function ($request) {
            if (str_contains($request->url(), rawurlencode('family@example.test'))) {
                return Http::response([
                    'error' => ['message' => 'The selected calendar does not support this conference type.'],
                ], 400);
            }

            return Http::response([
                'id' => 'primary-fallback-event',
                'htmlLink' => 'https://calendar.google.com/event?eid=primary',
                'hangoutLink' => 'https://meet.google.com/primary-fallback',
            ]);
        });

        $response = $this->postJson('/api/booking/bookings', [
            'eventTypeId' => $eventTypeId,
            'startsAt' => '2026-06-17T10:00:00+01:00',
            'timezone' => 'Africa/Lagos',
            'name' => 'Fallback Client',
            'email' => 'fallback-client@example.test',
            'phone' => '',
            'message' => '',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('booking.googleCalendarSyncStatus', 'synced')
            ->assertJsonPath('booking.locationValue', 'https://meet.google.com/primary-fallback');

        Http::assertSentCount(2);
        $this->assertStringContainsString(
            'https://meet.google.com/primary-fallback',
            DB::table('email_logs')
                ->where('source', 'booking-confirmation')
                ->where('recipient', 'fallback-client@example.test')
                ->value('body_html')
        );

        Carbon::setTestNow();
    }
}
