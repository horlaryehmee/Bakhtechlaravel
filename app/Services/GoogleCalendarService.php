<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class GoogleCalendarService
{
    public function __construct(private GoogleCalendarOAuthService $oauth) {}

    public function configured(): bool
    {
        return $this->setting('google_calendar_sync_enabled', 'false') === 'true'
            && $this->calendarId() !== ''
            && $this->accessToken() !== '';
    }

    public function createBookingEvent(object $booking, object $eventType): array
    {
        if (! $this->configured()) {
            return ['status' => 'not_configured'];
        }

        $attendees = [];
        if ($booking->email) {
            $attendees[] = ['email' => $booking->email, 'displayName' => $booking->name];
        }

        $reminders = $this->reminderMinutes($booking, $eventType);
        $payload = [
            'summary' => $eventType->name.' with '.$booking->name,
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
                'overrides' => collect($reminders)
                    ->take(5)
                    ->map(fn ($minutes) => ['method' => 'email', 'minutes' => $minutes])
                    ->values()
                    ->all(),
            ],
        ];

        if ($this->isGoogleMeetType((string) ($booking->location_type ?? $eventType->location_type)) && $this->setting('google_meet_auto_generate', 'true') === 'true') {
            $payload['conferenceData'] = [
                'createRequest' => [
                    'requestId' => 'bakhtech-booking-'.$booking->id,
                    'conferenceSolutionKey' => ['type' => 'hangoutsMeet'],
                ],
            ];
        } elseif ($booking->location_value) {
            $payload['location'] = $booking->location_value;
        }

        $calendarId = $this->calendarId();
        $response = $this->createEvent($calendarId, $payload);

        if (! $response->successful() && isset($payload['conferenceData']) && $calendarId !== 'primary') {
            $primaryResponse = $this->createEvent('primary', $payload);
            if ($primaryResponse->successful()) {
                $calendarId = 'primary';
                $response = $primaryResponse;
            } else {
                return [
                    'status' => 'failed',
                    'error' => $primaryResponse->json('error.message')
                        ?: $response->json('error.message')
                        ?: $primaryResponse->body()
                        ?: $response->body(),
                ];
            }
        }

        if (! $response->successful()) {
            return [
                'status' => 'failed',
                'error' => $response->json('error.message') ?: $response->body(),
            ];
        }

        $data = $response->json();
        $meetRequested = isset($payload['conferenceData']);
        $meetLink = $this->meetLink($data);

        if ($meetRequested && ! $meetLink && ! empty($data['id'])) {
            $meetLink = $this->waitForMeetLink($calendarId, (string) $data['id']);
        }

        return [
            'status' => $meetRequested && ! $meetLink ? 'conference_pending' : 'synced',
            'eventId' => $data['id'] ?? null,
            'eventUrl' => $data['htmlLink'] ?? null,
            'locationValue' => $meetLink,
        ];
    }

    private function createEvent(string $calendarId, array $payload)
    {
        return Http::withToken($this->accessToken())
            ->acceptJson()
            ->post($this->eventsUrl($calendarId), $payload);
    }

    private function waitForMeetLink(string $calendarId, string $eventId): ?string
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            if (! app()->environment('testing')) {
                usleep(500000);
            }

            $response = Http::withToken($this->accessToken())
                ->acceptJson()
                ->get($this->eventUrl($calendarId, $eventId));

            if (! $response->successful()) {
                continue;
            }

            $meetLink = $this->meetLink($response->json());
            if ($meetLink) {
                return $meetLink;
            }

            if ($response->json('conferenceData.createRequest.status.statusCode') === 'failure') {
                return null;
            }
        }

        return null;
    }

    private function meetLink(array $event): ?string
    {
        $entryPoint = collect($event['conferenceData']['entryPoints'] ?? [])
            ->firstWhere('entryPointType', 'video');
        $conferenceId = trim((string) ($event['conferenceData']['conferenceId'] ?? ''));

        return $entryPoint['uri'] ?? ($event['hangoutLink'] ?? ($conferenceId !== '' ? 'https://meet.google.com/'.$conferenceId : null));
    }

    private function isGoogleMeetType(string $type): bool
    {
        return in_array(strtolower(str_replace(['-', ' '], '_', trim($type))), ['google_meet', 'meet'], true);
    }

    private function reminderMinutes(object $booking, object $eventType): array
    {
        $calendar = ! empty($booking->booking_calendar_id)
            ? DB::table('booking_calendars')->where('id', $booking->booking_calendar_id)->first()
            : null;
        $settings = json_decode($calendar?->settings_json ?: '{}', true);
        $configured = $settings['email']['reminderMinutesBefore'] ?? [(int) $eventType->reminder_minutes_before];
        $values = is_array($configured) ? $configured : [$configured];

        return collect($values)
            ->map(fn ($value) => (int) $value)
            ->filter(fn ($value) => $value > 0 && $value <= 40320)
            ->unique()
            ->sortDesc()
            ->values()
            ->all();
    }

    private function calendarId(): string
    {
        return $this->setting('google_calendar_id', (string) config('services.google_calendar.calendar_id', 'primary'));
    }

    private function accessToken(): string
    {
        return $this->oauth->validAccessToken() ?: $this->setting('google_calendar_access_token', (string) config('services.google_calendar.access_token', ''));
    }

    private function eventsUrl(?string $calendarId = null): string
    {
        return 'https://www.googleapis.com/calendar/v3/calendars/'.rawurlencode($calendarId ?: $this->calendarId()).'/events?conferenceDataVersion=1&sendUpdates='.rawurlencode($this->setting('google_calendar_send_updates', 'all'));
    }

    private function eventUrl(string $calendarId, string $eventId): string
    {
        return 'https://www.googleapis.com/calendar/v3/calendars/'.rawurlencode($calendarId).'/events/'.rawurlencode($eventId).'?conferenceDataVersion=1';
    }

    private function setting(string $key, string $fallback = ''): string
    {
        return DB::table('booking_settings')->where('key', $key)->value('value') ?? $fallback;
    }
}
