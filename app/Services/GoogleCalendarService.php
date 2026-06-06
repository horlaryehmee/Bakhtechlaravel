<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;

class GoogleCalendarService
{
    public function __construct(private GoogleCalendarOAuthService $oauth)
    {
    }

    public function configured(): bool
    {
        return $this->setting('google_calendar_sync_enabled', 'false') === 'true'
            && $this->calendarId() !== ''
            && $this->accessToken() !== '';
    }

    public function createBookingEvent(object $booking, object $eventType): array
    {
        if (!$this->configured()) {
            return ['status' => 'not_configured'];
        }

        $attendees = [];
        if ($booking->email) {
            $attendees[] = ['email' => $booking->email, 'displayName' => $booking->name];
        }

        $payload = [
            'summary' => $eventType->name . ' with ' . $booking->name,
            'description' => trim("Service: {$booking->service}\nPhone: {$booking->phone}\n\n{$booking->message}"),
            'start' => [
                'dateTime' => $booking->starts_at,
                'timeZone' => $booking->timezone ?: $eventType->timezone,
            ],
            'end' => [
                'dateTime' => $booking->ends_at,
                'timeZone' => $booking->timezone ?: $eventType->timezone,
            ],
            'attendees' => $attendees,
            'reminders' => [
                'useDefault' => false,
                'overrides' => [
                    ['method' => 'email', 'minutes' => (int) $eventType->reminder_minutes_before],
                    ['method' => 'popup', 'minutes' => 10],
                ],
            ],
        ];

        if (($booking->location_type ?? $eventType->location_type) === 'google_meet' && $this->setting('google_meet_auto_generate', 'true') === 'true') {
            $payload['conferenceData'] = [
                'createRequest' => [
                    'requestId' => 'bakhtech-booking-' . $booking->id,
                    'conferenceSolutionKey' => ['type' => 'hangoutsMeet'],
                ],
            ];
        } elseif ($booking->location_value) {
            $payload['location'] = $booking->location_value;
        }

        $response = Http::withToken($this->accessToken())
            ->acceptJson()
            ->post($this->eventsUrl(), $payload);

        if (!$response->successful()) {
            return [
                'status' => 'failed',
                'error' => $response->json('error.message') ?: $response->body(),
            ];
        }

        $data = $response->json();
        $meetLink = collect($data['conferenceData']['entryPoints'] ?? [])
            ->firstWhere('entryPointType', 'video')['uri'] ?? null;

        return [
            'status' => 'synced',
            'eventId' => $data['id'] ?? null,
            'eventUrl' => $data['htmlLink'] ?? null,
            'locationValue' => $meetLink,
        ];
    }

    private function calendarId(): string
    {
        return $this->setting('google_calendar_id', (string) config('services.google_calendar.calendar_id', 'primary'));
    }

    private function accessToken(): string
    {
        return $this->oauth->validAccessToken() ?: $this->setting('google_calendar_access_token', (string) config('services.google_calendar.access_token', ''));
    }

    private function eventsUrl(): string
    {
        return 'https://www.googleapis.com/calendar/v3/calendars/' . rawurlencode($this->calendarId()) . '/events?conferenceDataVersion=1&sendUpdates=' . rawurlencode($this->setting('google_calendar_send_updates', 'all'));
    }

    private function setting(string $key, string $fallback = ''): string
    {
        return DB::table('booking_settings')->where('key', $key)->value('value') ?? $fallback;
    }
}
