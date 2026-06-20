<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('posts')) {
            return;
        }

        Schema::table('posts', function (Blueprint $table) {
            if (! Schema::hasColumn('posts', 'seo_title')) {
                $table->string('seo_title')->nullable()->after('status');
            }
            if (! Schema::hasColumn('posts', 'seo_description')) {
                $table->text('seo_description')->nullable()->after('seo_title');
            }
            if (! Schema::hasColumn('posts', 'focus_keyword')) {
                $table->string('focus_keyword')->nullable()->after('seo_description');
            }
            if (! Schema::hasColumn('posts', 'canonical_url')) {
                $table->string('canonical_url')->nullable()->after('focus_keyword');
            }
            if (! Schema::hasColumn('posts', 'meta_robots')) {
                $table->string('meta_robots')->default('index,follow')->after('canonical_url');
            }
            if (! Schema::hasColumn('posts', 'og_title')) {
                $table->string('og_title')->nullable()->after('meta_robots');
            }
            if (! Schema::hasColumn('posts', 'og_description')) {
                $table->text('og_description')->nullable()->after('og_title');
            }
            if (! Schema::hasColumn('posts', 'og_image')) {
                $table->string('og_image')->nullable()->after('og_description');
            }
            if (! Schema::hasColumn('posts', 'published_at')) {
                $table->timestamp('published_at')->nullable()->after('og_image');
            }
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->index(['status', 'updated_at'], 'posts_status_updated_index');
            $table->index(['category', 'updated_at'], 'posts_category_updated_index');
            $table->index('published_at', 'posts_published_at_index');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('posts')) {
            return;
        }

        Schema::table('posts', function (Blueprint $table) {
            $table->dropIndex('posts_status_updated_index');
            $table->dropIndex('posts_category_updated_index');
            $table->dropIndex('posts_published_at_index');
            $table->dropColumn([
                'seo_title',
                'seo_description',
                'focus_keyword',
                'canonical_url',
                'meta_robots',
                'og_title',
                'og_description',
                'og_image',
                'published_at',
            ]);
        });
    }
};
