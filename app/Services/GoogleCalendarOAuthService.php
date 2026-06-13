<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GoogleCalendarOAuthService
{
    public function authorizationUrl(int $adminId): array
    {
        $clientId = trim($this->setting('google_oauth_client_id', (string) config('services.google_calendar.oauth_client_id', '')));
        $clientSecret = trim($this->setting('google_oauth_client_secret', (string) config('services.google_calendar.oauth_client_secret', '')));
        if ($clientId === '') {
            return [
                'configured' => false,
                'message' => 'Google OAuth client ID is not configured. Save your Google OAuth Client ID first.',
                'redirectUri' => $this->redirectUri(),
            ];
        }

        if ($clientSecret === '') {
            return [
                'configured' => false,
                'message' => 'Google OAuth client secret is not configured. Save your Google OAuth Client Secret first.',
                'redirectUri' => $this->redirectUri(),
            ];
        }

        $state = Str::random(48);
        Cache::put($this->stateKey($state), $adminId, now()->addMinutes(15));

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'scope' => implode(' ', [
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/userinfo.email',
            ]),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ]);

        return [
            'configured' => true,
            'authUrl' => 'https://accounts.google.com/o/oauth2/v2/auth?'.$query,
            'redirectUri' => $this->redirectUri(),
        ];
    }

    public function handleCallback(string $code, string $state): bool
    {
        if (! Cache::pull($this->stateKey($state))) {
            return false;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->setting('google_oauth_client_id', (string) config('services.google_calendar.oauth_client_id', '')),
            'client_secret' => $this->setting('google_oauth_client_secret', (string) config('services.google_calendar.oauth_client_secret', '')),
            'redirect_uri' => $this->redirectUri(),
            'grant_type' => 'authorization_code',
            'code' => $code,
        ]);

        if (! $response->successful()) {
            return false;
        }

        $token = $response->json();
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return false;
        }

        $this->setSetting('google_calendar_access_token', $accessToken);
        if (! empty($token['refresh_token'])) {
            $this->setSetting('google_calendar_refresh_token', (string) $token['refresh_token']);
        }
        $this->setSetting('google_calendar_token_expires_at', now()->addSeconds((int) ($token['expires_in'] ?? 3600) - 60)->toIso8601String());
        $this->setSetting('google_calendar_sync_enabled', 'true');
        $this->setSetting('google_meet_auto_generate', 'true');

        $profile = Http::withToken($accessToken)->acceptJson()->get('https://www.googleapis.com/oauth2/v3/userinfo');
        if ($profile->successful() && $profile->json('email')) {
            $this->setSetting('google_connected_email', (string) $profile->json('email'));
        }

        return true;
    }

    public function calendarList(): array
    {
        $token = $this->validAccessToken();
        if ($token === '') {
            return [
                'calendars' => [],
                'message' => 'Google access has expired. Reconnect the account to grant Calendar access again.',
                'needsReconnect' => true,
            ];
        }

        $response = Http::withToken($token)
            ->acceptJson()
            ->get('https://www.googleapis.com/calendar/v3/users/me/calendarList');

        if (! $response->successful()) {
            return [
                'calendars' => [],
                'message' => $this->googleErrorMessage($response->json('error.message'), $response->status()),
                'needsReconnect' => in_array($response->status(), [401, 403], true),
            ];
        }

        $calendars = $this->mapCalendars($response->json('items', []));
        if ($calendars !== []) {
            return ['calendars' => $calendars, 'message' => null, 'needsReconnect' => false];
        }

        $primaryResponse = Http::withToken($token)
            ->acceptJson()
            ->get('https://www.googleapis.com/calendar/v3/calendars/primary');

        if ($primaryResponse->successful() && $primaryResponse->json('id')) {
            return [
                'calendars' => $this->mapCalendars([[
                    'id' => $primaryResponse->json('id'),
                    'summary' => $primaryResponse->json('summary') ?: $this->setting('google_connected_email', 'Primary calendar'),
                    'primary' => true,
                    'accessRole' => 'owner',
                ]]),
                'message' => null,
                'needsReconnect' => false,
            ];
        }

        return [
            'calendars' => [],
            'message' => $this->googleErrorMessage($primaryResponse->json('error.message'), $primaryResponse->status()),
            'needsReconnect' => in_array($primaryResponse->status(), [401, 403], true),
        ];
    }

    public function calendars(): array
    {
        return $this->calendarList()['calendars'];
    }

    private function mapCalendars(array $items): array
    {
        return collect($items)->map(fn ($calendar) => [
            'id' => (string) ($calendar['id'] ?? ''),
            'summary' => (string) ($calendar['summary'] ?? $calendar['id'] ?? ''),
            'primary' => (bool) ($calendar['primary'] ?? false),
            'accessRole' => (string) ($calendar['accessRole'] ?? ''),
            'canCreateEvents' => in_array((string) ($calendar['accessRole'] ?? ''), ['owner', 'writer'], true),
            'selected' => (string) ($calendar['id'] ?? '') === $this->setting('google_calendar_id', 'primary'),
        ])->filter(fn ($calendar) => $calendar['id'] !== '')->values()->all();
    }

    private function googleErrorMessage(?string $message, int $status): string
    {
        if ($message) {
            return 'Google Calendar: '.$message;
        }

        return $status === 401
            ? 'Google access has expired. Reconnect the account to grant Calendar access again.'
            : 'Google did not return any calendars. Confirm that the Google Calendar API is enabled for this OAuth project, then reconnect.';
    }

    public function selectCalendar(string $calendarId): void
    {
        $this->setSetting('google_calendar_id', $calendarId);
        $this->setSetting('google_calendar_sync_enabled', 'true');
    }

    public function validAccessToken(): string
    {
        $accessToken = $this->setting('google_calendar_access_token');
        $expiresAt = $this->setting('google_calendar_token_expires_at');

        $tokenStillValid = $expiresAt === '' || strtotime($expiresAt) > now()->timestamp;
        if ($accessToken !== '' && $tokenStillValid) {
            return $accessToken;
        }

        $refreshToken = $this->setting('google_calendar_refresh_token');
        if ($refreshToken === '') {
            return $accessToken;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->setting('google_oauth_client_id', (string) config('services.google_calendar.oauth_client_id', '')),
            'client_secret' => $this->setting('google_oauth_client_secret', (string) config('services.google_calendar.oauth_client_secret', '')),
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]);

        if (! $response->successful()) {
            return '';
        }

        $token = $response->json();
        $this->setSetting('google_calendar_access_token', (string) ($token['access_token'] ?? ''));
        $this->setSetting('google_calendar_token_expires_at', now()->addSeconds((int) ($token['expires_in'] ?? 3600) - 60)->toIso8601String());

        return (string) ($token['access_token'] ?? '');
    }

    public function redirectUri(): string
    {
        return url('/api/booking/google/callback');
    }

    private function stateKey(string $state): string
    {
        return 'booking_google_oauth_state_'.$state;
    }

    private function setting(string $key, string $fallback = ''): string
    {
        return DB::table('booking_settings')->where('key', $key)->value('value') ?? $fallback;
    }

    private function setSetting(string $key, string $value): void
    {
        DB::table('booking_settings')->updateOrInsert(
            ['key' => $key],
            ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
        );
    }
}
