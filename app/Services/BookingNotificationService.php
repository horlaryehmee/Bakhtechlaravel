<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class BookingNotificationService
{
    public function bookingCreated(int $bookingId): void
    {
        $booking = $this->booking($bookingId);
        if (! $booking) {
            return;
        }

        $settings = $this->calendarEmailSettings($booking);
        $variables = $this->variables($booking);
        $attendeeBody = $this->render(
            (string) ($settings['confirmationTemplate'] ?? $this->defaultConfirmationTemplate()),
            $variables
        );
        $adminBody = $this->render(
            (string) ($settings['adminTemplate'] ?? $this->defaultAdminTemplate()),
            $variables
        );

        $this->send(
            (string) $booking->email,
            (string) DB::table('booking_settings')->where('key', 'confirmation_email_subject')->value('value') ?: 'Your booking is confirmed',
            $attendeeBody,
            'booking-confirmation'
        );

        $adminEmail = $this->adminEmail($booking);
        if ($adminEmail !== '') {
            $this->send(
                $adminEmail,
                'New booking: '.($booking->event_type_name ?: $booking->service),
                $adminBody,
                'booking-admin-notification'
            );
        }

        $this->scheduleReminders($booking, $settings, $adminEmail);
    }

    public function sendDueReminders(int $limit = 100): array
    {
        $due = DB::table('booking_reminders')
            ->join('bookings', 'bookings.id', '=', 'booking_reminders.booking_id')
            ->leftJoin('booking_event_types', 'booking_event_types.id', '=', 'bookings.booking_event_type_id')
            ->leftJoin('booking_calendars', 'booking_calendars.id', '=', 'bookings.booking_calendar_id')
            ->select(
                'booking_reminders.*',
                'bookings.name',
                'bookings.email',
                'bookings.phone',
                'bookings.message',
                'bookings.service',
                'bookings.starts_at',
                'bookings.timezone',
                'bookings.attendee_timezone',
                'bookings.location_value',
                'bookings.status as booking_status',
                'booking_event_types.name as event_type_name',
                'booking_calendars.name as calendar_name',
                'booking_calendars.settings_json'
            )
            ->where('booking_reminders.status', 'pending')
            ->where('booking_reminders.scheduled_for', '<=', now())
            ->where('bookings.starts_at', '>', now())
            ->whereNotIn('bookings.status', ['cancelled', 'closed', 'completed'])
            ->orderBy('booking_reminders.scheduled_for')
            ->limit($limit)
            ->get();

        $sent = 0;
        $failed = 0;

        foreach ($due as $reminder) {
            $settings = $this->decodedEmailSettings($reminder->settings_json ?? null);
            $body = $this->render(
                (string) ($settings['reminderTemplate'] ?? $this->defaultReminderTemplate()),
                $this->variables($reminder)
            );

            try {
                Mail::raw($body, function ($message) use ($reminder) {
                    $message->to($reminder->recipient_email)
                        ->subject(
                            (string) DB::table('booking_settings')
                                ->where('key', 'reminder_email_subject')
                                ->value('value') ?: 'Reminder: your booking is coming up'
                        )
                        ->getHeaders()
                        ->addTextHeader('X-Bakhtech-Source', 'booking-reminder');
                });

                DB::table('booking_reminders')->where('id', $reminder->id)->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                    'error_message' => null,
                    'updated_at' => now(),
                ]);
                $sent++;
            } catch (\Throwable $exception) {
                DB::table('booking_reminders')->where('id', $reminder->id)->update([
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                    'updated_at' => now(),
                ]);
                $failed++;
            }
        }

        return ['processed' => $due->count(), 'sent' => $sent, 'failed' => $failed];
    }

    private function scheduleReminders(object $booking, array $settings, string $adminEmail): void
    {
        if (! Schema::hasTable('booking_reminders')) {
            return;
        }

        $offsets = $this->reminderOffsets($settings, (int) ($booking->reminder_minutes_before ?? 60));
        $recipients = [
            'attendee' => strtolower(trim((string) $booking->email)),
            'admin' => strtolower(trim($adminEmail)),
        ];

        foreach ($offsets as $minutes) {
            $scheduledFor = Carbon::parse($booking->starts_at, $booking->timezone ?: 'UTC')->subMinutes($minutes);
            if ($scheduledFor->isPast()) {
                continue;
            }

            foreach ($recipients as $type => $email) {
                if ($email === '') {
                    continue;
                }

                DB::table('booking_reminders')->updateOrInsert(
                    ['booking_id' => $booking->id, 'recipient_type' => $type, 'minutes_before' => $minutes],
                    [
                        'recipient_email' => $email,
                        'scheduled_for' => $scheduledFor->toDateTimeString(),
                        'status' => 'pending',
                        'sent_at' => null,
                        'error_message' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    private function booking(int $bookingId): ?object
    {
        return DB::table('bookings')
            ->leftJoin('booking_event_types', 'booking_event_types.id', '=', 'bookings.booking_event_type_id')
            ->leftJoin('booking_calendars', 'booking_calendars.id', '=', 'bookings.booking_calendar_id')
            ->select(
                'bookings.*',
                'booking_event_types.name as event_type_name',
                'booking_event_types.reminder_minutes_before',
                'booking_calendars.name as calendar_name',
                'booking_calendars.settings_json'
            )
            ->where('bookings.id', $bookingId)
            ->first();
    }

    private function calendarEmailSettings(object $booking): array
    {
        return $this->decodedEmailSettings($booking->settings_json ?? null);
    }

    private function decodedEmailSettings(?string $settingsJson): array
    {
        $settings = json_decode($settingsJson ?: '{}', true);

        return is_array($settings['email'] ?? null) ? $settings['email'] : [];
    }

    private function reminderOffsets(array $settings, int $fallback): array
    {
        $configured = $settings['reminderMinutesBefore'] ?? [$fallback];
        $values = is_array($configured) ? $configured : [$configured];

        return collect($values)
            ->map(fn ($value) => (int) $value)
            ->filter(fn ($value) => $value > 0 && $value <= 43200)
            ->unique()
            ->sortDesc()
            ->values()
            ->all();
    }

    private function adminEmail(object $booking): string
    {
        $resourceEmail = ! empty($booking->booking_resource_id)
            ? DB::table('booking_resources')->where('id', $booking->booking_resource_id)->value('email')
            : null;

        return strtolower(trim((string) (
            $resourceEmail
            ?: DB::table('booking_settings')->where('key', 'admin_alert_email')->value('value')
            ?: DB::table('settings')->where('key', 'contactEmail')->value('value')
        )));
    }

    private function send(string $email, string $subject, string $body, string $source): void
    {
        if ($email === '') {
            return;
        }

        try {
            Mail::raw($body, function ($message) use ($email, $subject, $source) {
                $message->to($email)
                    ->subject($subject)
                    ->getHeaders()
                    ->addTextHeader('X-Bakhtech-Source', $source);
            });
        } catch (\Throwable $exception) {
            if (Schema::hasTable('email_logs')) {
                DB::table('email_logs')->insert([
                    'recipient' => strtolower($email),
                    'subject' => $subject,
                    'body_text' => $body,
                    'source' => $source,
                    'mailer' => config('mail.default'),
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function variables(object $booking): array
    {
        $timezone = $booking->attendee_timezone ?: $booking->timezone ?: 'UTC';
        $time = Carbon::parse($booking->starts_at, $booking->timezone ?: 'UTC')
            ->setTimezone($timezone)
            ->format('l, F j, Y \a\t g:i A T');

        return [
            '{{name}}' => (string) $booking->name,
            '{{email}}' => (string) $booking->email,
            '{{phone}}' => (string) ($booking->phone ?? ''),
            '{{time}}' => $time,
            '{{calendarName}}' => (string) ($booking->calendar_name ?: $booking->event_type_name ?: $booking->service),
            '{{location}}' => (string) ($booking->location_value ?? ''),
            '{{message}}' => (string) ($booking->message ?? ''),
        ];
    }

    private function render(string $template, array $variables): string
    {
        return strtr($template, $variables);
    }

    private function defaultConfirmationTemplate(): string
    {
        return "Hello {{name}},\n\nYour booking is confirmed.\n\nTime: {{time}}\nMeeting: {{calendarName}}\nLocation: {{location}}\n\nThank you.";
    }

    private function defaultAdminTemplate(): string
    {
        return "A new booking has been received.\n\nName: {{name}}\nEmail: {{email}}\nPhone: {{phone}}\nTime: {{time}}\nMeeting: {{calendarName}}\nLocation: {{location}}\nMessage: {{message}}";
    }

    private function defaultReminderTemplate(): string
    {
        return "Hello {{name}},\n\nThis is a reminder for your upcoming booking.\n\nTime: {{time}}\nMeeting: {{calendarName}}\nLocation: {{location}}\n\nThank you.";
    }
}
