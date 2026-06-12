<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GoogleBusinessReviewsService
{
    private const TRUSTINDEX_VERSION = '13.2.9';

    public function connection(string $provider = 'google'): array
    {
        $provider = $this->provider($provider);
        $token = $this->connectionToken($provider);
        $pageId = $this->setting("{$provider}_trustindex_page_id");
        $accessToken = $this->setting("{$provider}_trustindex_access_token");
        $params = [
            'webhook_url' => url("/api/reviews/{$provider}/trustindex-webhook"),
            'email' => $this->setting('adminEmail', config('mail.from.address', '')),
            'token' => $token,
            'version' => self::TRUSTINDEX_VERSION,
        ];

        if ($pageId === '') {
            $params['type'] = ucfirst($provider);
            $params['referrer'] = 'public';
            $popupUrl = 'https://admin.trustindex.io/source/edit2?' . http_build_query($params);
        } else {
            $params['type'] = $provider;
            $params['page_id'] = $pageId;
            $params['access_token'] = $accessToken;
            $popupUrl = 'https://admin.trustindex.io/source/wordpressPageRequest?' . http_build_query($params);
        }

        return [
            'connected' => $pageId !== '',
            'popupUrl' => $popupUrl,
            'businessName' => $this->setting("{$provider}_trustindex_business_name"),
            'businessAddress' => $this->setting("{$provider}_trustindex_business_address"),
            'pageId' => $pageId,
            'provider' => ucfirst($provider),
            'hasAccessToken' => $accessToken !== '',
            'maskedAccessToken' => $this->maskSecret($accessToken),
            'webhookUrl' => url("/api/reviews/{$provider}/trustindex-webhook"),
            'connectionEndpoint' => url("/api/admin/reviews/{$provider}/connection"),
            'lastSyncedAt' => $this->setting("{$provider}_reviews_last_synced_at"),
            'lastError' => $this->setting("{$provider}_reviews_last_error"),
            'importedReviewCount' => (int) DB::table('reviews')->where('provider', $provider)->count(),
            'googleReviewCount' => (int) $this->setting("{$provider}_trustindex_review_count", '0'),
            'connectorLimit' => 'Trustindex free connections may return fewer reviews than the business total. Complete history requires the appropriate Trustindex plan/API entitlement.',
        ];
    }

    public function disconnect(string $provider = 'google'): void
    {
        $provider = $this->provider($provider);
        DB::table('settings')->whereIn('key', [
            "{$provider}_trustindex_page_id",
            "{$provider}_trustindex_access_token",
            "{$provider}_trustindex_business_name",
            "{$provider}_trustindex_business_address",
            "{$provider}_trustindex_review_count",
            "{$provider}_reviews_last_synced_at",
            "{$provider}_reviews_last_error",
        ])->delete();

        DB::table('review_sources')->where('provider', $provider)->update([
            'place_id' => '',
            'oauth_access_token' => null,
            'last_synced_at' => null,
            'updated_at' => now(),
        ]);
    }

    public function importPayload(array $payload, string $provider = 'google'): array
    {
        $provider = $this->provider($provider);
        $payload = $this->unwrapPayload($payload);
        $reviews = collect($this->reviewItems($payload))
            ->filter(fn ($review) => is_array($review) && $this->passesImportFilters($review))
            ->take(20)
            ->values()
            ->all();

        if ($reviews === []) {
            $message = 'Trustindex returned no reviews matching the saved extraction filters.';
            $this->setSetting("{$provider}_reviews_last_error", $message);

            return ['ok' => false, 'imported' => 0, 'updated' => 0, 'total' => 0, 'message' => $message];
        }

        $this->storeBusiness($payload, $provider);
        $sourceId = $this->reviewSourceId($payload, $provider);
        $imported = 0;
        $updated = 0;

        foreach ($reviews as $review) {
            if (!is_array($review)) {
                continue;
            }

            $author = (string) data_get($review, 'reviewer.name', data_get($review, 'user.name', ucfirst($provider).' reviewer'));
            $content = trim((string) ($review['text'] ?? $review['comment'] ?? ''));
            $reviewedAt = substr((string) ($review['created_at'] ?? $review['date'] ?? now()->toDateString()), 0, 10);
            $rating = max(1, min(5, (int) ($review['rating'] ?? 5)));
            $externalId = trim((string) ($review['id'] ?? $review['reviewId'] ?? ''));

            if ($externalId === '') {
                $externalId = hash('sha256', $author . '|' . $content . '|' . $reviewedAt);
            }

            $values = [
                'review_source_id' => $sourceId,
                'provider' => $provider,
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
                ->where('provider', $provider)
                ->where('external_id', $externalId)
                ->exists();

            DB::table('reviews')->updateOrInsert(
                ['provider' => $provider, 'external_id' => $externalId],
                $exists ? $values : [...$values, 'created_at' => now()],
            );

            $exists ? $updated++ : $imported++;
        }

        $total = $imported + $updated;
        $this->setSetting("{$provider}_reviews_last_synced_at", now()->toIso8601String());
        $this->setSetting("{$provider}_reviews_last_error", '');

        return [
            'ok' => true,
            'imported' => $imported,
            'updated' => $updated,
            'total' => $total,
            'message' => "Imported {$imported} new ".ucfirst($provider)." reviews and updated {$updated}. Maximum 20 per extraction.",
        ];
    }

    public function webhook(array $payload, string $provider = 'google'): bool
    {
        $provider = $this->provider($provider);
        $token = (string) ($payload['token'] ?? request()->query('token', ''));
        if ($token === '' || !hash_equals($this->connectionToken($provider), $token)) {
            return false;
        }

        $this->importPayload($payload, $provider);

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
        return collect($this->findReviewLists($payload))
            ->flatten(1)
            ->filter(fn ($review) => is_array($review))
            ->unique(fn ($review) => (string) ($review['id'] ?? $review['reviewId'] ?? md5(json_encode($review))))
            ->values()
            ->all();
    }

    private function findReviewLists(array $payload): array
    {
        $lists = [];

        foreach ($payload as $key => $value) {
            if (!is_array($value)) {
                continue;
            }

            if ($key === 'reviews' && array_is_list($value)) {
                $lists[] = $value;
                continue;
            }

            if (in_array($key, ['items', 'data'], true) && array_is_list($value) && $this->looksLikeReviewList($value)) {
                $lists[] = $value;
                continue;
            }

            $lists = [...$lists, ...$this->findReviewLists($value)];
        }

        return $lists;
    }

    private function looksLikeReviewList(array $items): bool
    {
        $first = $items[0] ?? null;

        return is_array($first)
            && (isset($first['reviewer']) || isset($first['rating']) || isset($first['text']) || isset($first['comment']));
    }

    private function storeBusiness(array $payload, string $provider): void
    {
        $pageId = trim((string) ($payload['page_id'] ?? $payload['id'] ?? ''));
        if ($pageId !== '') {
            $this->setSetting("{$provider}_trustindex_page_id", $pageId);
        }

        $accessToken = trim((string) ($payload['access_token'] ?? ''));
        if ($accessToken !== '') {
            $this->setSetting("{$provider}_trustindex_access_token", $accessToken);
        }

        $name = $payload['name'] ?? '';
        if (is_array($name)) {
            $name = $name['name'] ?? reset($name) ?: '';
        }

        $this->setSetting("{$provider}_trustindex_business_name", trim((string) $name));
        $this->setSetting("{$provider}_trustindex_business_address", trim((string) ($payload['address'] ?? '')));
        $reviewCount = data_get($payload, 'reviews.count', $payload['rating_number'] ?? $payload['review_count'] ?? null);
        if (is_numeric($reviewCount)) {
            $this->setSetting("{$provider}_trustindex_review_count", (string) (int) $reviewCount);
        }
    }

    private function reviewSourceId(array $payload, string $provider): int
    {
        $pageId = trim((string) ($payload['page_id'] ?? $payload['id'] ?? $this->setting("{$provider}_trustindex_page_id")));

        DB::table('review_sources')->updateOrInsert(
            ['provider' => $provider],
            [
                'name' => ucfirst($provider).' Reviews',
                'place_id' => $pageId,
                'enabled' => true,
                'last_synced_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ],
        );

        return (int) DB::table('review_sources')->where('provider', $provider)->value('id');
    }

    private function connectionToken(string $provider): string
    {
        $token = $this->setting("{$provider}_trustindex_connection_token");
        if ($token !== '') {
            return $token;
        }

        $token = Str::random(48);
        $this->setSetting("{$provider}_trustindex_connection_token", $token);

        return $token;
    }

    private function passesImportFilters(array $review): bool
    {
        $content = trim(strip_tags((string) ($review['text'] ?? $review['comment'] ?? '')));
        $rating = max(1, min(5, (int) ($review['rating'] ?? 5)));
        $wordCount = str_word_count($content);
        $characterCount = mb_strlen($content);
        $minWords = max(0, (int) $this->setting('reviewFrontendMinWords', '0'));
        $maxWords = max(0, (int) $this->setting('reviewFrontendMaxWords', '0'));
        $minCharacters = max(0, (int) $this->setting('reviewFrontendMinCharacters', '0'));
        $maxCharacters = max(0, (int) $this->setting('reviewFrontendMaxCharacters', '0'));
        $minRating = min(5, max(1, (int) $this->setting('reviewFrontendMinRating', '1')));

        return $rating >= $minRating
            && $wordCount >= $minWords
            && ($maxWords === 0 || $wordCount <= $maxWords)
            && $characterCount >= $minCharacters
            && ($maxCharacters === 0 || $characterCount <= $maxCharacters);
    }

    private function provider(string $provider): string
    {
        return in_array(strtolower($provider), ['google', 'trustpilot'], true)
            ? strtolower($provider)
            : 'google';
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
