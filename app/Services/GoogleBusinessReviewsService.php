<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GoogleBusinessReviewsService
{
    public function authorizationUrl(int $adminId): array
    {
        $clientId = trim($this->setting('google_business_client_id', $this->setting('google_oauth_client_id')));
        $clientSecret = trim($this->setting('google_business_client_secret', $this->setting('google_oauth_client_secret')));

        if ($clientId === '' || $clientSecret === '') {
            return [
                'configured' => false,
                'message' => 'Save Google Business Client ID and Client Secret before connecting reviews.',
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
                'https://www.googleapis.com/auth/business.manage',
                'https://www.googleapis.com/auth/userinfo.email',
            ]),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ]);

        return [
            'configured' => true,
            'authUrl' => 'https://accounts.google.com/o/oauth2/v2/auth?' . $query,
            'redirectUri' => $this->redirectUri(),
        ];
    }

    public function handleCallback(string $code, string $state): bool
    {
        if (!Cache::pull($this->stateKey($state))) {
            return false;
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->setting('google_business_client_id', $this->setting('google_oauth_client_id')),
            'client_secret' => $this->setting('google_business_client_secret', $this->setting('google_oauth_client_secret')),
            'redirect_uri' => $this->redirectUri(),
            'grant_type' => 'authorization_code',
            'code' => $code,
        ]);

        if (!$response->successful()) {
            return false;
        }

        $token = $response->json();
        $accessToken = (string) ($token['access_token'] ?? '');
        if ($accessToken === '') {
            return false;
        }

        $this->setSetting('google_business_access_token', $accessToken);
        if (!empty($token['refresh_token'])) {
            $this->setSetting('google_business_refresh_token', (string) $token['refresh_token']);
        }
        $this->setSetting('google_business_token_expires_at', now()->addSeconds((int) ($token['expires_in'] ?? 3600) - 60)->toIso8601String());

        $profile = Http::withToken($accessToken)->acceptJson()->get('https://www.googleapis.com/oauth2/v3/userinfo');
        if ($profile->successful() && $profile->json('email')) {
            $this->setSetting('google_business_connected_email', (string) $profile->json('email'));
        }

        return true;
    }

    public function locations(bool $forceRefresh = false): array
    {
        if (!$forceRefresh) {
            $cached = $this->cachedLocations();
            if ($cached !== null) {
                return $cached;
            }
        }

        $token = $this->validAccessToken();
        if ($token === '') {
            $this->setSetting('google_business_reviews_last_error', 'Google Business Reviews is connected, but no valid access token is available. Reconnect Google.');
            return $this->cachedLocations() ?? [];
        }

        $accounts = Http::withToken($token)
            ->acceptJson()
            ->get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts');

        if (!$accounts->successful()) {
            $this->setSetting('google_business_reviews_last_error', $this->googleErrorMessage($accounts, 'Google could not load Business Profile accounts.'));
            return $this->cachedLocations() ?? [];
        }

        $locations = collect($accounts->json('accounts', []))
            ->flatMap(function ($account) use ($token) {
                $accountName = (string) ($account['name'] ?? '');
                if ($accountName === '') {
                    return [];
                }

                $locations = Http::withToken($token)
                    ->acceptJson()
                    ->get('https://mybusinessbusinessinformation.googleapis.com/v1/' . $accountName . '/locations', [
                        'readMask' => 'name,title,storefrontAddress',
                        'pageSize' => 100,
                    ]);

                if (!$locations->successful()) {
                    $this->setSetting('google_business_reviews_last_error', $this->googleErrorMessage($locations, 'Google could not load Business Profile locations.'));
                    return [];
                }

                return collect($locations->json('locations', []))->map(function ($location) use ($accountName, $account) {
                    $reviewLocationName = $accountName . '/' . (string) ($location['name'] ?? '');

                    return [
                        'accountName' => $accountName,
                        'accountLabel' => (string) ($account['accountName'] ?? $account['name'] ?? ''),
                        'locationName' => $reviewLocationName,
                        'title' => (string) ($location['title'] ?? $location['name'] ?? ''),
                        'selected' => $reviewLocationName === $this->setting('google_business_location_name'),
                    ];
                });
            })
            ->filter(fn ($location) => $location['locationName'] !== '')
            ->values()
            ->all();

        if ($locations) {
            $this->setSetting('google_business_locations_cache', json_encode($locations));
            $this->setSetting('google_business_locations_cached_at', now()->toIso8601String());
            $this->setSetting('google_business_reviews_last_error', '');
        }

        return $locations;
    }

    public function selectLocation(string $locationName): array
    {
        $this->setSetting('google_business_location_name', $locationName);

        return $this->settingsShape();
    }

    public function importReviews(): array
    {
        $token = $this->validAccessToken();
        $locationName = $this->setting('google_business_location_name');
        if ($token === '' || $locationName === '') {
            $message = $locationName === ''
                ? 'Select a Google Business location before importing reviews.'
                : 'Google Business Reviews is connected, but no valid access token is available. Reconnect Google.';
            $this->setSetting('google_business_reviews_last_error', $message);

            return ['ok' => false, 'imported' => 0, 'updated' => 0, 'total' => 0, 'message' => $message];
        }

        $sourceId = $this->reviewSourceId();
        $pageToken = null;
        $imported = 0;
        $updated = 0;
        $total = 0;

        do {
            $query = ['pageSize' => 50];
            if ($pageToken) {
                $query['pageToken'] = $pageToken;
            }

            $response = Http::withToken($token)
                ->acceptJson()
                ->get('https://mybusiness.googleapis.com/v4/' . $locationName . '/reviews', $query);

            if (!$response->successful()) {
                $message = $this->googleErrorMessage($response, 'Google returned an error while loading reviews.');
                $this->setSetting('google_business_reviews_last_error', $message);

                return ['ok' => false, 'imported' => $imported, 'updated' => $updated, 'total' => $total, 'message' => $message];
            }

            foreach ($response->json('reviews', []) as $review) {
                $externalId = (string) ($review['reviewId'] ?? '');
                if ($externalId === '') {
                    continue;
                }

                $payload = [
                    'review_source_id' => $sourceId,
                    'provider' => 'google',
                    'external_id' => $externalId,
                    'author_name' => (string) data_get($review, 'reviewer.displayName', 'Google reviewer'),
                    'author_image' => (string) data_get($review, 'reviewer.profilePhotoUrl', ''),
                    'rating' => $this->ratingValue((string) ($review['starRating'] ?? 'FIVE')),
                    'content' => trim((string) ($review['comment'] ?? '')),
                    'external_url' => (string) ($review['name'] ?? ''),
                    'reviewed_at' => substr((string) ($review['createTime'] ?? now()->toDateString()), 0, 10),
                    'is_featured' => true,
                    'is_published' => true,
                    'updated_at' => now(),
                ];

                if ($payload['content'] === '') {
                    $payload['content'] = $payload['rating'] . '-star Google review.';
                }

                $exists = DB::table('reviews')->where('provider', 'google')->where('external_id', $externalId)->exists();
                DB::table('reviews')->updateOrInsert(
                    ['provider' => 'google', 'external_id' => $externalId],
                    $exists ? $payload : array_merge($payload, ['created_at' => now()])
                );

                $exists ? $updated++ : $imported++;
                $total++;
            }

            $pageToken = $response->json('nextPageToken');
        } while ($pageToken);

        $this->setSetting('google_business_reviews_last_synced_at', now()->toIso8601String());
        $this->setSetting('google_business_reviews_last_error', '');

        return ['ok' => true, 'imported' => $imported, 'updated' => $updated, 'total' => $total, 'message' => "Imported {$imported} new Google reviews and updated {$updated}."];
    }

    public function settingsShape(): array
    {
        return [
            'connectedEmail' => $this->setting('google_business_connected_email'),
            'locationName' => $this->setting('google_business_location_name'),
            'lastSyncedAt' => $this->setting('google_business_reviews_last_synced_at'),
            'lastError' => $this->setting('google_business_reviews_last_error'),
            'locationsCachedAt' => $this->setting('google_business_locations_cached_at'),
            'redirectUri' => $this->redirectUri(),
        ];
    }

    private function cachedLocations(): ?array
    {
        $cachedAt = $this->setting('google_business_locations_cached_at');
        $cacheFresh = $cachedAt !== '' && strtotime($cachedAt) > now()->subDay()->timestamp;
        $json = $this->setting('google_business_locations_cache');
        if (!$cacheFresh || $json === '') {
            return null;
        }

        $locations = json_decode($json, true);
        if (!is_array($locations)) {
            return null;
        }

        $selectedLocation = $this->setting('google_business_location_name');

        return collect($locations)->map(function ($location) use ($selectedLocation) {
            $location['selected'] = ($location['locationName'] ?? '') === $selectedLocation;
            return $location;
        })->values()->all();
    }

    private function googleErrorMessage($response, string $fallback): string
    {
        $status = $response->status();
        $message = (string) data_get($response->json(), 'error.message', '');
        if ($message !== '') {
            return "Google API error {$status}: {$message}";
        }

        $body = trim(substr($response->body(), 0, 220));
        return $body !== '' ? "Google API error {$status}: {$body}" : "Google API error {$status}: {$fallback}";
    }

    private function validAccessToken(): string
    {
        $accessToken = $this->setting('google_business_access_token');
        $expiresAt = $this->setting('google_business_token_expires_at');
        if ($accessToken !== '' && ($expiresAt === '' || strtotime($expiresAt) > now()->timestamp)) {
            return $accessToken;
        }

        $refreshToken = $this->setting('google_business_refresh_token');
        if ($refreshToken === '') {
            return '';
        }

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->setting('google_business_client_id', $this->setting('google_oauth_client_id')),
            'client_secret' => $this->setting('google_business_client_secret', $this->setting('google_oauth_client_secret')),
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]);

        if (!$response->successful()) {
            return '';
        }

        $token = $response->json();
        $this->setSetting('google_business_access_token', (string) ($token['access_token'] ?? ''));
        $this->setSetting('google_business_token_expires_at', now()->addSeconds((int) ($token['expires_in'] ?? 3600) - 60)->toIso8601String());

        return (string) ($token['access_token'] ?? '');
    }

    private function reviewSourceId(): int
    {
        DB::table('review_sources')->updateOrInsert(
            ['provider' => 'google'],
            ['name' => 'Google Reviews', 'enabled' => true, 'updated_at' => now(), 'created_at' => now()]
        );

        return (int) DB::table('review_sources')->where('provider', 'google')->value('id');
    }

    private function ratingValue(string $rating): int
    {
        return [
            'ONE' => 1,
            'TWO' => 2,
            'THREE' => 3,
            'FOUR' => 4,
            'FIVE' => 5,
        ][$rating] ?? 5;
    }

    private function redirectUri(): string
    {
        return url('/api/admin/reviews/google/callback');
    }

    private function stateKey(string $state): string
    {
        return 'google_business_reviews_oauth_state_' . $state;
    }

    private function setting(string $key, string $fallback = ''): string
    {
        return DB::table('settings')->where('key', $key)->value('value') ?? $fallback;
    }

    private function setSetting(string $key, string $value): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => $key],
            ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
        );
    }
}
