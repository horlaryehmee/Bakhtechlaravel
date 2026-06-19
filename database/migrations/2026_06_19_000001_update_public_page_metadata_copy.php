<?php

use App\Support\SiteDefaults;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('pages')) {
            return;
        }

        $oldCopy = [
            'home' => [
                'excerpt' => 'Fast, SEO-ready websites, ecommerce stores, booking systems, and custom web apps for businesses in Nigeria, the United States, Canada, and worldwide.',
                'seo_title' => 'Bakhtech Solutions | SEO Web Design & Web Apps',
                'seo_description' => 'Bakhtech Solutions builds fast, SEO-ready websites, ecommerce stores, booking systems and custom web apps for businesses in Nigeria, the US, Canada and worldwide.',
                'focus_keyword' => 'SEO web design agency',
            ],
            'about' => [
                'excerpt' => 'Learn how Bakhtech Solutions designs and develops conversion-focused websites and web systems for growing businesses.',
                'seo_title' => 'About Bakhtech Solutions | Web Design Agency',
                'seo_description' => 'Meet Bakhtech Solutions, a web design and development agency building fast websites, ecommerce stores, booking systems and business web apps.',
                'focus_keyword' => 'web design agency',
            ],
            'portfolio' => [
                'excerpt' => 'Explore Bakhtech Solutions web design, ecommerce, booking system, and custom web app projects.',
                'seo_title' => 'Web Design Portfolio | Bakhtech Solutions',
                'seo_description' => 'See websites, ecommerce stores, booking platforms and custom web apps built by Bakhtech Solutions for real businesses.',
                'focus_keyword' => 'web design portfolio',
            ],
            'ebook' => [
                'excerpt' => 'Practical website strategy resources for business owners planning a stronger online presence.',
                'seo_title' => 'Website Strategy Ebook | Bakhtech Solutions',
                'seo_description' => 'Download practical website strategy resources from Bakhtech Solutions for planning SEO-ready business websites and digital systems.',
                'focus_keyword' => 'website strategy ebook',
            ],
            'career' => [
                'excerpt' => 'Work with Bakhtech Solutions on modern web design, development, SEO, ecommerce, and business automation projects.',
                'seo_title' => 'Careers | Bakhtech Solutions',
                'seo_description' => 'Explore career opportunities with Bakhtech Solutions across web design, frontend development, Laravel, SEO and digital product work.',
                'focus_keyword' => 'web design careers',
            ],
            'contact' => [
                'excerpt' => 'Talk to Bakhtech Solutions about your website, ecommerce store, booking system, portal, dashboard, or SEO project.',
                'seo_title' => 'Contact Bakhtech Solutions | Start Your Website Project',
                'seo_description' => 'Contact Bakhtech Solutions to plan a fast, SEO-ready website, ecommerce store, booking system, dashboard, or custom web app.',
                'focus_keyword' => 'contact web design agency',
            ],
        ];

        foreach (SiteDefaults::pages() as $page) {
            $slug = $page['slug'];
            $existing = DB::table('pages')->where('slug', $slug)->first();

            if (! $existing) {
                continue;
            }

            $previous = $oldCopy[$slug] ?? [];
            $updates = [];

            foreach (['excerpt', 'seo_title', 'seo_description', 'focus_keyword', 'og_image', 'twitter_image'] as $field) {
                $current = (string) ($existing->{$field} ?? '');

                if ($current === '' || $current === ($previous[$field] ?? null)) {
                    $updates[$field] = $page[$field] ?? '';
                }
            }

            $socialMeta = [
                'og_title' => 'seo_title',
                'twitter_title' => 'seo_title',
                'og_description' => 'seo_description',
                'twitter_description' => 'seo_description',
            ];

            foreach ($socialMeta as $field => $sourceField) {
                $current = (string) ($existing->{$field} ?? '');
                $oldSourceValue = $previous[$sourceField] ?? null;

                if ($current === '' || $current === $oldSourceValue) {
                    $updates[$field] = $page[$sourceField] ?? '';
                }
            }

            if ($updates !== []) {
                DB::table('pages')->where('id', $existing->id)->update($updates + [
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
    }
};
