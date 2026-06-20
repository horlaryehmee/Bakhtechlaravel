<?php

namespace Database\Seeders;

use App\Services\DatabaseSynchronizer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BakhtechSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $email = (string) config('security.bootstrap_admin_email');

        if (! DB::table('admins')->where('email', $email)->exists()) {
            DB::table('admins')->insert([
                'email' => $email,
                'password_hash' => Hash::make((string) config('security.bootstrap_admin_password')),
                'name' => (string) config('security.bootstrap_admin_name'),
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        if (DB::table('projects')->count() === 0) {
            $projects = [
                [
                    'title' => 'Bayara Ecommerce Store',
                    'category' => 'Ecommerce',
                    'summary' => 'A product-led online store experience for fast product discovery and ordering.',
                    'description' => 'Built for a retail brand that needed a clean catalogue, campaign-ready sections, and a responsive shopping journey.',
                    'image' => '/social-preview.png',
                    'website_url' => 'https://bayara.ng',
                    'services_json' => json_encode(['Ecommerce', 'UI/UX', 'Performance']),
                    'metrics_json' => json_encode(['seo' => '92', 'performance' => '88', 'conversion' => 'Improved product discovery']),
                    'is_featured' => true,
                    'status' => 'published',
                ],
                [
                    'title' => 'Consultation Booking Website',
                    'category' => 'Booking System',
                    'summary' => 'A consultation-first website with service pages, booking flow, and trust-focused messaging.',
                    'description' => 'Designed to help visitors understand the service, choose the right appointment, and take action quickly.',
                    'image' => '/showcase/showcase-03.jpg',
                    'website_url' => '',
                    'services_json' => json_encode(['Booking System', 'Website', 'SEO']),
                    'metrics_json' => json_encode(['seo' => '90', 'performance' => '91', 'conversion' => 'Clearer booking journey']),
                    'is_featured' => true,
                    'status' => 'published',
                ],
            ];

            foreach ($projects as $project) {
                DB::table('projects')->insert(array_merge($project, [
                    'slug' => Str::slug($project['title']),
                    'cover_image' => '',
                    'video_url' => '',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]));
            }
        }

        app(DatabaseSynchronizer::class)->repair();

        $this->seedDemoReviews($now);
    }

    private function seedDemoReviews($now): void
    {
        DB::table('review_sources')->updateOrInsert(
            ['provider' => 'google'],
            [
                'name' => 'Google Reviews',
                'external_url' => '',
                'api_key' => '',
                'place_id' => '',
                'business_unit_id' => '',
                'enabled' => true,
                'oauth_account_name' => '',
                'oauth_location_name' => '',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );

        $sourceId = DB::table('review_sources')->where('provider', 'google')->value('id');

        $reviews = [
            [
                'external_id' => 'demo-google-ryaz-bello',
                'author_name' => 'Ryaz Bello',
                'rating' => 5,
                'content' => 'Professionalism at its peak! Bakhtech delivered exceptional service from start to finish.',
                'reviewed_at' => '2026-04-29',
            ],
            [
                'external_id' => 'demo-google-ugo-amaeshi',
                'author_name' => 'UGO AMAESHI',
                'rating' => 5,
                'content' => 'Bakhtech did an amazing job on our website. I highly recommend their team.',
                'reviewed_at' => '2025-06-18',
            ],
            [
                'external_id' => 'demo-google-amina-yusuf',
                'author_name' => 'Amina Yusuf',
                'rating' => 5,
                'content' => 'The process was smooth, communication was clear, and the finished website looks excellent.',
                'reviewed_at' => '2026-03-12',
            ],
        ];

        foreach ($reviews as $review) {
            DB::table('reviews')->updateOrInsert(
                ['external_id' => $review['external_id']],
                array_merge($review, [
                    'review_source_id' => $sourceId,
                    'provider' => 'google',
                    'author_image' => '',
                    'external_url' => '',
                    'is_featured' => true,
                    'is_published' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]),
            );
        }
    }
}
