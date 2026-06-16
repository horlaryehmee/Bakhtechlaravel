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

        foreach (SiteDefaults::pages() as $index => $page) {
            $payload = [
                'title' => $page['title'],
                'template' => 'default',
                'parent_id' => null,
                'sort_order' => $index,
                'excerpt' => $page['excerpt'] ?? '',
                'seo_title' => $page['seo_title'] ?? $page['title'].' | Bakhtech Solutions',
                'seo_description' => $page['seo_description'] ?? '',
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
                'updated_at' => now(),
            ];

            $existing = DB::table('pages')->where('slug', $page['slug'])->first();
            if ($existing) {
                DB::table('pages')->where('id', $existing->id)->update($payload);
                continue;
            }

            DB::table('pages')->insert($payload + [
                'slug' => $page['slug'],
                'content' => '',
                'created_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
    }
};
