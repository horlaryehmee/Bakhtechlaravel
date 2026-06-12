<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PublicReviewFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_reviews_follow_saved_content_filters(): void
    {
        DB::table('reviews')->delete();
        $now = now();

        $this->insertReview('short', 'Too short', 5, 'google', true, $now);
        $this->insertReview('matching', 'This review contains exactly seven useful words today', 5, 'google', true, $now->copy()->subMinute());
        $this->insertReview('low-rating', 'This review contains enough words but low rating', 3, 'google', true, $now->copy()->subMinutes(2));
        $this->insertReview('wrong-provider', 'This review contains enough words and characters', 5, 'trustpilot', true, $now->copy()->subMinutes(3));
        $this->insertReview('not-featured', 'This review contains enough words and characters', 5, 'google', false, $now->copy()->subMinutes(4));

        $this->saveSettings([
            'reviewFrontendMinWords' => '5',
            'reviewFrontendMaxWords' => '8',
            'reviewFrontendMinCharacters' => '40',
            'reviewFrontendMaxCharacters' => '0',
            'reviewFrontendMinRating' => '4',
            'reviewFrontendProvider' => 'google',
            'reviewFrontendFeaturedOnly' => 'true',
            'reviewFrontendLimit' => '10',
        ]);

        $response = $this->getJson('/api/reviews')->assertOk();

        $response->assertJsonCount(1, 'reviews');
        $response->assertJsonPath('reviews.0.content', 'This review contains exactly seven useful words today');
    }

    public function test_public_review_limit_is_configurable(): void
    {
        DB::table('reviews')->delete();

        foreach (range(1, 5) as $index) {
            $this->insertReview(
                "review-{$index}",
                "This is public review number {$index}",
                5,
                'google',
                true,
                now()->subMinutes($index),
            );
        }

        $this->saveSettings(['reviewFrontendLimit' => '3']);

        $this->getJson('/api/reviews')
            ->assertOk()
            ->assertJsonCount(3, 'reviews');
    }

    private function insertReview(string $externalId, string $content, int $rating, string $provider, bool $featured, $createdAt): void
    {
        DB::table('reviews')->insert([
            'review_source_id' => null,
            'provider' => $provider,
            'external_id' => $externalId,
            'author_name' => 'Reviewer',
            'author_image' => '',
            'rating' => $rating,
            'content' => $content,
            'external_url' => '',
            'reviewed_at' => $createdAt->toDateString(),
            'is_featured' => $featured,
            'is_published' => true,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);
    }

    private function saveSettings(array $settings): void
    {
        foreach ($settings as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()],
            );
        }
    }
}
