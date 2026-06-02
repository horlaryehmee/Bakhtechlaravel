<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BakhtechSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $email = env('ADMIN_EMAIL', 'admin@bakhtech.com.ng');

        if (!DB::table('admins')->where('email', $email)->exists()) {
            DB::table('admins')->insert([
                'email' => $email,
                'password_hash' => Hash::make(env('ADMIN_PASSWORD', 'ChangeMe123!')),
                'name' => env('ADMIN_NAME', 'Bakhtech Admin'),
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
                    'image' => '/showcase/showcase-01.jpg',
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

        if (DB::table('pages')->count() === 0) {
            foreach (['Home', 'About', 'Portfolio', 'Ebook', 'Career', 'Contact'] as $title) {
                DB::table('pages')->insert([
                    'title' => $title,
                    'slug' => Str::slug($title),
                    'content' => $title . ' page content',
                    'seo_title' => $title . ' | Bakhtech Solutions',
                    'seo_description' => 'Manage ' . $title . ' page SEO and content.',
                    'status' => 'published',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        if (DB::table('settings')->count() === 0) {
            foreach ($this->defaultSettings() as $key => $value) {
                DB::table('settings')->insert([
                    'key' => $key,
                    'value' => $value,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    private function defaultSettings(): array
    {
        return [
            'siteName' => 'Bakhtech Solutions',
            'contactEmail' => 'solutions@bakhtech.com.ng',
            'phone' => '+234 708 637 2833',
            'activeHome' => 'home',
            'homePortfolioShowDescriptions' => 'true',
        ];
    }
}

