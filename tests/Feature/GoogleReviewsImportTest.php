<?php

namespace Tests\Feature;

use App\Services\GoogleBusinessReviewsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleReviewsImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_trustindex_place_payload_imports_google_reviews(): void
    {
        $result = app(GoogleBusinessReviewsService::class)->importPayload([
            'id' => 'google-place-123',
            'name' => 'Bakhtech Solutions',
            'address' => 'Lekki, Lagos',
            'access_token' => 'trustindex-access-token',
            'reviews' => [
                [
                    'id' => 'review-1',
                    'reviewer' => [
                        'name' => 'Example Customer',
                        'avatar_url' => 'https://example.test/avatar.jpg',
                    ],
                    'text' => 'Excellent service.',
                    'rating' => 5,
                    'created_at' => '2026-06-10T12:30:00Z',
                ],
            ],
        ]);

        $this->assertTrue($result['ok']);
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseHas('reviews', [
            'provider' => 'google',
            'external_id' => 'review-1',
            'author_name' => 'Example Customer',
            'content' => 'Excellent service.',
            'rating' => 5,
        ]);
        $this->assertSame('google-place-123', DB::table('settings')->where('key', 'google_trustindex_page_id')->value('value'));
        $this->assertSame('Bakhtech Solutions', DB::table('settings')->where('key', 'google_trustindex_business_name')->value('value'));
    }

    public function test_refresh_payload_updates_existing_review_without_duplicates(): void
    {
        $service = app(GoogleBusinessReviewsService::class);
        $payload = [
            'place' => [
                'id' => 'google-place-123',
                'name' => 'Bakhtech Solutions',
                'reviews' => [
                    [
                        'id' => 'review-1',
                        'reviewer' => ['name' => 'Example Customer'],
                        'text' => 'Good service.',
                        'rating' => 4,
                        'created_at' => '2026-06-10',
                    ],
                ],
            ],
        ];

        $service->importPayload($payload);
        $payload['place']['reviews'][0]['text'] = 'Excellent service.';
        $payload['place']['reviews'][0]['rating'] = 5;
        $result = $service->importPayload($payload);

        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['updated']);
        $this->assertSame(1, DB::table('reviews')->where('external_id', 'review-1')->count());
        $this->assertDatabaseHas('reviews', [
            'external_id' => 'review-1',
            'content' => 'Excellent service.',
            'rating' => 5,
        ]);
    }

    public function test_connection_diagnostics_mask_the_access_token(): void
    {
        DB::table('settings')->insert([
            [
                'key' => 'google_trustindex_page_id',
                'value' => 'google-place-123',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'google_trustindex_access_token',
                'value' => 'abcd1234567890wxyz',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $connection = app(GoogleBusinessReviewsService::class)->connection();

        $this->assertTrue($connection['connected']);
        $this->assertTrue($connection['hasAccessToken']);
        $this->assertSame('abcd********wxyz', $connection['maskedAccessToken']);
        $this->assertNotSame('abcd1234567890wxyz', $connection['maskedAccessToken']);
    }

    public function test_disconnect_removes_credentials_but_keeps_imported_reviews(): void
    {
        $service = app(GoogleBusinessReviewsService::class);
        $service->importPayload([
            'id' => 'google-place-123',
            'access_token' => 'private-token',
            'reviews' => [[
                'id' => 'review-1',
                'reviewer' => ['name' => 'Example Customer'],
                'text' => 'Excellent service.',
                'rating' => 5,
                'created_at' => '2026-06-10',
            ]],
        ]);

        $service->disconnect();

        $this->assertFalse($service->connection()['connected']);
        $this->assertDatabaseHas('reviews', ['external_id' => 'review-1']);
        $this->assertDatabaseMissing('settings', ['key' => 'google_trustindex_access_token']);
    }

    public function test_import_collects_reviews_from_all_nested_pages(): void
    {
        $result = app(GoogleBusinessReviewsService::class)->importPayload([
            'id' => 'google-place-123',
            'reviews' => [
                'count' => 3,
                'pages' => [
                    [
                        'items' => [
                            ['id' => 'review-1', 'reviewer' => ['name' => 'One'], 'text' => 'First', 'rating' => 5],
                            ['id' => 'review-2', 'reviewer' => ['name' => 'Two'], 'text' => 'Second', 'rating' => 4],
                        ],
                    ],
                    [
                        'items' => [
                            ['id' => 'review-3', 'reviewer' => ['name' => 'Three'], 'text' => 'Third', 'rating' => 5],
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertTrue($result['ok']);
        $this->assertSame(3, $result['imported']);
        $this->assertSame(3, DB::table('reviews')->where('provider', 'google')->count());
        $this->assertSame(3, app(GoogleBusinessReviewsService::class)->connection()['googleReviewCount']);
    }

    public function test_extraction_filters_reviews_and_caps_accepted_results_at_twenty(): void
    {
        DB::table('settings')->insert([
            ['key' => 'reviewFrontendMinWords', 'value' => '5', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'reviewFrontendMinCharacters', 'value' => '20', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'reviewFrontendMinRating', 'value' => '4', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $reviews = [[
            'id' => 'filtered-out',
            'reviewer' => ['name' => 'Short'],
            'text' => 'Too short',
            'rating' => 5,
        ]];

        foreach (range(1, 25) as $index) {
            $reviews[] = [
                'id' => "accepted-{$index}",
                'reviewer' => ['name' => "Reviewer {$index}"],
                'text' => "This is accepted review number {$index}",
                'rating' => 5,
            ];
        }

        $result = app(GoogleBusinessReviewsService::class)->importPayload([
            'id' => 'google-place-123',
            'reviews' => $reviews,
        ]);

        $this->assertSame(20, $result['imported']);
        $this->assertSame(20, DB::table('reviews')->where('provider', 'google')->count());
        $this->assertDatabaseMissing('reviews', ['external_id' => 'filtered-out']);
    }

    public function test_trustpilot_uses_separate_connection_and_review_storage(): void
    {
        $service = app(GoogleBusinessReviewsService::class);
        $result = $service->importPayload([
            'id' => 'trustpilot-business-123',
            'name' => 'Bakhtech Solutions',
            'access_token' => 'trustpilot-token',
            'reviews' => [[
                'id' => 'trustpilot-review-1',
                'reviewer' => ['name' => 'Trustpilot Customer'],
                'text' => 'Excellent service from the entire team.',
                'rating' => 5,
            ]],
        ], 'trustpilot');

        $this->assertTrue($result['ok']);
        $this->assertDatabaseHas('reviews', [
            'provider' => 'trustpilot',
            'external_id' => 'trustpilot-review-1',
        ]);
        $this->assertFalse($service->connection('trustpilot')['connected']);
        $this->assertSame('trustpilot-business-123', $service->connection('trustpilot')['pageId']);
        $this->assertFalse($service->connection('google')['connected']);
    }

    public function test_trustpilot_sync_reads_public_profile_pages_and_applies_import_filters(): void
    {
        DB::table('settings')->insert([
            ['key' => 'reviewFrontendMinWords', 'value' => '4', 'created_at' => now(), 'updated_at' => now()],
        ]);

        Http::fake([
            'www.trustpilot.com/review/bakhtech.com.ng*' => Http::response(
                $this->trustpilotPage([
                    [
                        'id' => 'trustpilot-short',
                        'rating' => 5,
                        'text' => 'Too short',
                        'consumer' => ['displayName' => 'Short Reviewer'],
                        'dates' => ['publishedDate' => '2026-06-10T12:00:00Z'],
                    ],
                    [
                        'id' => 'trustpilot-review-2',
                        'rating' => 5,
                        'title' => 'Excellent service',
                        'text' => 'The entire team delivered excellent work.',
                        'consumer' => [
                            'displayName' => 'Happy Customer',
                            'imageUrl' => 'https://example.test/customer.jpg',
                        ],
                        'dates' => ['publishedDate' => '2026-06-11T12:00:00Z'],
                    ],
                ])
            ),
        ]);

        $result = app(GoogleBusinessReviewsService::class)
            ->syncTrustpilot('https://www.trustpilot.com/review/bakhtech.com.ng');

        $this->assertTrue($result['ok']);
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseHas('reviews', [
            'provider' => 'trustpilot',
            'external_id' => 'trustpilot-review-2',
            'author_name' => 'Happy Customer',
            'author_image' => 'https://example.test/customer.jpg',
            'rating' => 5,
        ]);
        $this->assertDatabaseMissing('reviews', ['external_id' => 'trustpilot-short']);
        $this->assertSame(
            'https://www.trustpilot.com/review/bakhtech.com.ng',
            DB::table('settings')->where('key', 'trustpilot_business_url')->value('value')
        );
        $this->assertTrue(app(GoogleBusinessReviewsService::class)->connection('trustpilot')['connected']);

        Http::assertSentCount(1);
    }

    public function test_trustpilot_sync_rejects_non_trustpilot_urls_without_requesting_them(): void
    {
        Http::fake();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Use a Trustpilot URL');

        try {
            app(GoogleBusinessReviewsService::class)->syncTrustpilot('https://example.test/review/business');
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_trustpilot_sync_fetches_multiple_pages_when_the_business_has_more_reviews(): void
    {
        Http::fake(function ($request) {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
            $page = (int) ($query['page'] ?? 1);

            return Http::response($this->trustpilotPage([[
                'id' => "trustpilot-page-{$page}",
                'rating' => 5,
                'text' => "Review fetched from page {$page}.",
                'consumer' => ['displayName' => "Reviewer {$page}"],
                'dates' => ['publishedDate' => "2026-06-0{$page}T12:00:00Z"],
            ]], 21));
        });

        $result = app(GoogleBusinessReviewsService::class)
            ->syncTrustpilot('https://uk.trustpilot.com/review/bakhtech.com.ng');

        $this->assertSame(2, $result['imported']);
        $this->assertDatabaseHas('reviews', ['external_id' => 'trustpilot-page-1']);
        $this->assertDatabaseHas('reviews', ['external_id' => 'trustpilot-page-2']);
        Http::assertSentCount(2);
    }

    public function test_trustpilot_sync_reports_browser_verification_blocks(): void
    {
        Http::fake([
            'www.trustpilot.com/*' => Http::response(
                '<html><title>Verifying your connection...</title></html>',
                403
            ),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Trustpilot blocked the server request with browser verification.');

        app(GoogleBusinessReviewsService::class)
            ->syncTrustpilot('https://www.trustpilot.com/review/bakhtech.com.ng');
    }

    private function trustpilotPage(array $reviews, ?int $totalReviews = null): string
    {
        $payload = [
            'props' => [
                'pageProps' => [
                    'businessUnit' => [
                        'displayName' => 'Bakhtech Solutions',
                        'numberOfReviews' => $totalReviews ?? count($reviews),
                        'trustScore' => 4.8,
                    ],
                    'reviews' => $reviews,
                ],
            ],
        ];

        return '<html><body><script id="__NEXT_DATA__" type="application/json">'
            .json_encode($payload, JSON_THROW_ON_ERROR)
            .'</script></body></html>';
    }
}
