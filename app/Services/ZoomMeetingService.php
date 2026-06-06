<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class ZoomMeetingService
{
    public function configured(): bool
    {
        return $this->setting('zoom_enabled', 'false') === 'true'
            && $this->setting('zoom_account_id') !== ''
            && $this->setting('zoom_client_id') !== ''
            && $this->setting('zoom_client_secret') !== '';
    }

    public function createBookingMeeting(object $booking, object $eventType): array
    {
        if (($booking->location_type ?? '') !== 'zoom' || $this->setting('zoom_auto_generate', 'true') !== 'true') {
            return ['status' => 'skipped'];
        }

        if (!$this->configured()) {
            return ['status' => 'not_configured'];
        }

        $token = $this->accessToken();
        if (!$token) {
            return ['status' => 'failed', 'error' => 'Unable to get Zoom access token.'];
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->post('https://api.zoom.us/v2/users/' . rawurlencode($this->setting('zoom_user_id', 'me')) . '/meetings', [
                'topic' => $eventType->name . ' with ' . $booking->name,
                'type' => 2,
                'start_time' => $booking->starts_at,
                'duration' => (int) $eventType->duration_minutes,
                'timezone' => $booking->timezone ?: $eventType->timezone,
                'agenda' => trim("Service: {$booking->service}\nPhone: {$booking->phone}\n\n{$booking->message}"),
                'settings' => [
                    'join_before_host' => false,
                    'waiting_room' => true,
                    'approval_type' => 0,
                    'registrants_email_notification' => true,
                ],
            ]);

        if (!$response->successful()) {
            return [
                'status' => 'failed',
                'error' => $response->json('message') ?: $response->body(),
            ];
        }

        return [
            'status' => 'synced',
            'meetingId' => $response->json('id'),
            'joinUrl' => $response->json('join_url'),
            'startUrl' => $response->json('start_url'),
        ];
    }

    private function accessToken(): string
    {
        $response = Http::asForm()
            ->withBasicAuth($this->setting('zoom_client_id'), $this->setting('zoom_client_secret'))
            ->post('https://zoom.us/oauth/token', [
                'grant_type' => 'account_credentials',
                'account_id' => $this->setting('zoom_account_id'),
            ]);

        return $response->successful() ? (string) $response->json('access_token', '') : '';
    }

    private function setting(string $key, string $fallback = ''): string
    {
        return DB::table('booking_settings')->where('key', $key)->value('value') ?? $fallback;
    }
}
