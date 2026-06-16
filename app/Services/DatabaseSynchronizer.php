<?php

namespace App\Services;

use App\Support\SiteDefaults;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSynchronizer
{
    public function repair(): array
    {
        return DB::transaction(function (): array {
            $changes = [
                'admins' => 0,
                'pages' => 0,
                'page_placeholders' => 0,
                'settings' => 0,
                'review_sources' => 0,
            ];

            if (DB::table('admins')->count() === 0) {
                DB::table('admins')->insert([
                    'email' => strtolower((string) config('security.bootstrap_admin_email')),
                    'password_hash' => Hash::make((string) config('security.bootstrap_admin_password')),
                    'name' => (string) config('security.bootstrap_admin_name'),
                    'role' => 'admin',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $changes['admins']++;
            }

            foreach (SiteDefaults::pages() as $page) {
                $existing = DB::table('pages')->where('slug', $page['slug'])->first();

                if (! $existing) {
                    DB::table('pages')->insert([
                        'title' => $page['title'],
                        'slug' => $page['slug'],
                        'template' => 'default',
                        'parent_id' => null,
                        'sort_order' => 0,
                        'content' => '',
                        'excerpt' => $page['excerpt'] ?? '',
                        'seo_title' => $page['seo_title'] ?? $page['title'].' | Bakhtech Solutions',
                        'seo_description' => $page['seo_description'] ?? 'Learn more about '.$page['title'].' at Bakhtech Solutions.',
                        'canonical_url' => '',
                        'meta_robots' => 'index,follow',
                        'focus_keyword' => $page['focus_keyword'] ?? '',
                        'og_title' => $page['seo_title'] ?? '',
                        'og_description' => $page['seo_description'] ?? '',
                        'og_image' => '',
                        'twitter_title' => $page['seo_title'] ?? '',
                        'twitter_description' => $page['seo_description'] ?? '',
                        'twitter_image' => '',
                        'schema_type' => 'WebPage',
                        'schema_json' => '',
                        'status' => 'published',
                        'published_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $changes['pages']++;

                    continue;
                }

                if (trim((string) $existing->content) === $page['title'].' page content') {
                    DB::table('pages')->where('id', $existing->id)->update([
                        'content' => '',
                        'updated_at' => now(),
                    ]);
                    $changes['page_placeholders']++;
                }
            }

            foreach (SiteDefaults::settings() as $key => $value) {
                if (! DB::table('settings')->where('key', $key)->exists()) {
                    DB::table('settings')->insert([
                        'key' => $key,
                        'value' => $value,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $changes['settings']++;
                }
            }

            if (! DB::table('review_sources')->where('provider', 'google')->exists()) {
                DB::table('review_sources')->insert([
                    'provider' => 'google',
                    'name' => 'Google Reviews',
                    'external_url' => '',
                    'api_key' => '',
                    'place_id' => '',
                    'business_unit_id' => '',
                    'enabled' => true,
                    'oauth_account_name' => '',
                    'oauth_location_name' => '',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $changes['review_sources']++;
            }

            return $changes;
        });
    }
}
