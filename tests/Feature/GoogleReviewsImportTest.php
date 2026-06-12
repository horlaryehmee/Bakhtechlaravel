<?php

namespace Tests\Feature;

use App\Services\GoogleBusinessReviewsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
}
