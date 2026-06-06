<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            if (!Schema::hasColumn('pages', 'excerpt')) {
                $table->text('excerpt')->nullable()->after('content');
            }
            if (!Schema::hasColumn('pages', 'template')) {
                $table->string('template')->default('default')->after('slug');
            }
            if (!Schema::hasColumn('pages', 'parent_id')) {
                $table->unsignedBigInteger('parent_id')->nullable()->after('template');
            }
            if (!Schema::hasColumn('pages', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('parent_id');
            }
            if (!Schema::hasColumn('pages', 'canonical_url')) {
                $table->string('canonical_url')->nullable()->after('seo_description');
            }
            if (!Schema::hasColumn('pages', 'meta_robots')) {
                $table->string('meta_robots')->default('index,follow')->after('canonical_url');
            }
            if (!Schema::hasColumn('pages', 'focus_keyword')) {
                $table->string('focus_keyword')->nullable()->after('meta_robots');
            }
            if (!Schema::hasColumn('pages', 'og_title')) {
                $table->string('og_title')->nullable()->after('focus_keyword');
            }
            if (!Schema::hasColumn('pages', 'og_description')) {
                $table->text('og_description')->nullable()->after('og_title');
            }
            if (!Schema::hasColumn('pages', 'og_image')) {
                $table->string('og_image')->nullable()->after('og_description');
            }
            if (!Schema::hasColumn('pages', 'twitter_title')) {
                $table->string('twitter_title')->nullable()->after('og_image');
            }
            if (!Schema::hasColumn('pages', 'twitter_description')) {
                $table->text('twitter_description')->nullable()->after('twitter_title');
            }
            if (!Schema::hasColumn('pages', 'twitter_image')) {
                $table->string('twitter_image')->nullable()->after('twitter_description');
            }
            if (!Schema::hasColumn('pages', 'schema_type')) {
                $table->string('schema_type')->default('WebPage')->after('twitter_image');
            }
            if (!Schema::hasColumn('pages', 'schema_json')) {
                $table->longText('schema_json')->nullable()->after('schema_type');
            }
            if (!Schema::hasColumn('pages', 'published_at')) {
                $table->timestamp('published_at')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            foreach ([
                'excerpt',
                'template',
                'parent_id',
                'sort_order',
                'canonical_url',
                'meta_robots',
                'focus_keyword',
                'og_title',
                'og_description',
                'og_image',
                'twitter_title',
                'twitter_description',
                'twitter_image',
                'schema_type',
                'schema_json',
                'published_at',
            ] as $column) {
                if (Schema::hasColumn('pages', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
