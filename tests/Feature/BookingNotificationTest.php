<?php

namespace Tests\Feature;

use App\Services\BookingNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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

        foreach ([2, 3] as $daysAhead) {
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
                'location_type' => 'google_meet',
                'location_value' => 'https://meet.example.test/test',
                'google_calendar_sync_status' => 'not_configured',
                'cancel_token' => fake()->uuid(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $service->bookingCreated($bookingId);
        }

        $this->assertSame(4, DB::table('email_logs')->count());
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
    }
}
