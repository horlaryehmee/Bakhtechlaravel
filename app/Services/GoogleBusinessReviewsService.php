<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GoogleBusinessReviewsService
{
    private const TRUSTINDEX_VERSION = '13.2.9';

    public function connection(): array
    {
        $token = $this->connectionToken();
        $pageId = $this->setting('google_trustindex_page_id');
        $accessToken = $this->setting('google_trustindex_access_token');
        $params = [
            'webhook_url' => url('/api/reviews/google/trustindex-webhook'),
            'email' => $this->setting('adminEmail', config('mail.from.address', '')),
            'token' => $token,
            'version' => self::TRUSTINDEX_VERSION,
        ];

        if ($pageId === '') {
            $params['type'] = 'Google';
            $params['referrer'] = 'public';
            $popupUrl = 'https://admin.trustindex.io/source/edit2?' . http_build_query($params);
        } else {
            $params['type'] = 'google';
            $params['page_id'] = $pageId;
            $params['access_token'] = $this->setting('google_trustindex_access_token');
            $popupUrl = 'https://admin.trustindex.io/source/wordpressPageRequest?' . http_build_query($params);
        }

        return [
            'connected' => $pageId !== '',
            'popupUrl' => $popupUrl,
            'businessName' => $this->setting('google_trustindex_business_name'),
            'businessAddress' => $this->setting('google_trustindex_business_address'),
            'pageId' => $pageId,
            'provider' => 'Trustindex',
            'hasAccessToken' => $accessToken !== '',
            'maskedAccessToken' => $this->maskSecret($accessToken),
            'webhookUrl' => url('/api/reviews/google/trustindex-webhook'),
            'connectionEndpoint' => url('/api/admin/reviews/google/connection'),
            'lastSyncedAt' => $this->setting('google_business_reviews_last_synced_at'),
            'lastError' => $this->setting('google_business_reviews_last_error'),
        ];
    }

    public function disconnect(): void
    {
        DB::table('settings')->whereIn('key', [
            'google_trustindex_page_id',
            'google_trustindex_access_token',
            'google_trustindex_business_name',
            'google_trustindex_business_address',
            'google_business_reviews_last_synced_at',
            'google_business_reviews_last_error',
        ])->delete();

        DB::table('review_sources')->where('provider', 'google')->update([
            'place_id' => '',
            'oauth_access_token' => null,
            'last_synced_at' => null,
            'updated_at' => now(),
        ]);
    }

    public function importPayload(array $payload): array
    {
        $payload = $this->unwrapPayload($payload);
        $reviews = $this->reviewItems($payload);

        if ($reviews === []) {
            $message = 'Trustindex did not return any Google reviews for this business.';
            $this->setSetting('google_business_reviews_last_error', $message);

            return ['ok' => false, 'imported' => 0, 'updated' => 0, 'total' => 0, 'message' => $message];
        }

        $this->storeBusiness($payload);
        $sourceId = $this->reviewSourceId($payload);
        $imported = 0;
        $updated = 0;

        foreach ($reviews as $review) {
            if (!is_array($review)) {
                continue;
            }

            $author = (string) data_get($review, 'reviewer.name', data_get($review, 'user.name', 'Google reviewer'));
            $content = trim((string) ($review['text'] ?? $review['comment'] ?? ''));
            $reviewedAt = substr((string) ($review['created_at'] ?? $review['date'] ?? now()->toDateString()), 0, 10);
            $rating = max(1, min(5, (int) ($review['rating'] ?? 5)));
            $externalId = trim((string) ($review['id'] ?? $review['reviewId'] ?? ''));

            if ($externalId === '') {
                $externalId = hash('sha256', $author . '|' . $content . '|' . $reviewedAt);
            }

            $values = [
                'review_source_id' => $sourceId,
                'provider' => 'google',
                'external_id' => $externalId,
                'author_name' => $author,
                'author_image' => (string) data_get($review, 'reviewer.avatar_url', data_get($review, 'user.avatar_url', '')),
                'rating' => $rating,
                'content' => $content !== '' ? $content : $rating . '-star Google review.',
                'external_url' => (string) ($review['url'] ?? $review['review_url'] ?? ''),
                'reviewed_at' => $reviewedAt,
                'is_featured' => true,
                'is_published' => true,
                'updated_at' => now(),
            ];

            $exists = DB::table('reviews')
                ->where('provider', 'google')
                ->where('external_id', $externalId)
                ->exists();

            DB::table('reviews')->updateOrInsert(
                ['provider' => 'google', 'external_id' => $externalId],
                $exists ? $values : [...$values, 'created_at' => now()],
            );

            $exists ? $updated++ : $imported++;
        }

        $total = $imported + $updated;
        $this->setSetting('google_business_reviews_last_synced_at', now()->toIso8601String());
        $this->setSetting('google_business_reviews_last_error', '');

        return [
            'ok' => true,
            'imported' => $imported,
            'updated' => $updated,
            'total' => $total,
            'message' => "Imported {$imported} new Google reviews and updated {$updated}.",
        ];
    }

    public function webhook(array $payload): bool
    {
        $token = (string) ($payload['token'] ?? request()->query('token', ''));
        if ($token === '' || !hash_equals($this->connectionToken(), $token)) {
            return false;
        }

        $this->importPayload($payload);

        return true;
    }

    private function unwrapPayload(array $payload): array
    {
        foreach (['place', 'data'] as $key) {
            if (isset($payload[$key]) && is_array($payload[$key])) {
                return $payload[$key];
            }

            if (isset($payload[$key]) && is_string($payload[$key])) {
                $decoded = json_decode($payload[$key], true);
                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        return $payload;
    }

    private function reviewItems(array $payload): array
    {
        $reviews = $payload['reviews'] ?? [];
        if (!is_array($reviews)) {
            return [];
        }

        if (array_is_list($reviews)) {
            return $reviews;
        }

        foreach (['items', 'data', 'reviews'] as $key) {
            if (isset($reviews[$key]) && is_array($reviews[$key]) && array_is_list($reviews[$key])) {
                return $reviews[$key];
            }
        }

        return [];
    }

    private function storeBusiness(array $payload): void
    {
        $pageId = trim((string) ($payload['page_id'] ?? $payload['id'] ?? ''));
        if ($pageId !== '') {
            $this->setSetting('google_trustindex_page_id', $pageId);
        }

        $accessToken = trim((string) ($payload['access_token'] ?? ''));
        if ($accessToken !== '') {
            $this->setSetting('google_trustindex_access_token', $accessToken);
        }

        $name = $payload['name'] ?? '';
        if (is_array($name)) {
            $name = $name['name'] ?? reset($name) ?: '';
        }

        $this->setSetting('google_trustindex_business_name', trim((string) $name));
        $this->setSetting('google_trustindex_business_address', trim((string) ($payload['address'] ?? '')));
    }

    private function reviewSourceId(array $payload): int
    {
        $pageId = trim((string) ($payload['page_id'] ?? $payload['id'] ?? $this->setting('google_trustindex_page_id')));

        DB::table('review_sources')->updateOrInsert(
            ['provider' => 'google'],
            [
                'name' => 'Google Reviews',
                'place_id' => $pageId,
                'enabled' => true,
                'last_synced_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return (int) DB::table('review_sources')->where('provider', 'google')->value('id');
    }

    private function connectionToken(): string
    {
        $token = $this->setting('google_trustindex_connection_token');
        if ($token !== '') {
            return $token;
        }

        $token = Str::random(48);
        $this->setSetting('google_trustindex_connection_token', $token);

        return $token;
    }

    private function maskSecret(string $secret): string
    {
        if ($secret === '') {
            return '';
        }

        if (strlen($secret) <= 8) {
            return str_repeat('*', strlen($secret));
        }

        return substr($secret, 0, 4) . str_repeat('*', 8) . substr($secret, -4);
    }

    private function setting(string $key, string $fallback = ''): string
    {
        return DB::table('settings')->where('key', $key)->value('value') ?? $fallback;
    }

    private function setSetting(string $key, string $value): void
    {
        DB::table('settings')->updateOrInsert(
            ['key' => $key],
            ['value' => $value, 'created_at' => now(), 'updated_at' => now()],
        );
    }
}
