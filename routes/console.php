<?php

use Illuminate\Foundation\Inspiring;
use Carbon\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('booking:send-reminders', function () {
    $now = now();
    $bookings = DB::table('bookings')
        ->join('booking_event_types', 'booking_event_types.id', '=', 'bookings.booking_event_type_id')
        ->select('bookings.*', 'booking_event_types.name as event_type_name', 'booking_event_types.reminder_minutes_before')
        ->whereNull('bookings.reminder_sent_at')
        ->whereNotIn('bookings.status', ['cancelled', 'closed'])
        ->whereNotNull('bookings.starts_at')
        ->where('bookings.starts_at', '>', $now)
        ->limit(50)
        ->get()
        ->filter(fn ($booking) => now()->addMinutes((int) $booking->reminder_minutes_before)->greaterThanOrEqualTo(Carbon::parse($booking->starts_at)));

    foreach ($bookings as $booking) {
        if (!$booking->email) {
            continue;
        }

        Mail::raw(
            "Hello {$booking->name},\n\nThis is a reminder for your {$booking->event_type_name} with Bakhtech Solutions.\n\nTime: {$booking->starts_at} ({$booking->timezone})\nLocation: {$booking->location_value}\n\nThank you.",
            fn ($message) => $message
                ->to($booking->email)
                ->subject('Reminder: Your Bakhtech booking is coming up')
        );

        DB::table('bookings')->where('id', $booking->id)->update([
            'reminder_sent_at' => now(),
            'updated_at' => now(),
        ]);
    }

    $this->info('Sent ' . $bookings->count() . ' booking reminders.');
})->purpose('Send due booking reminder emails');
