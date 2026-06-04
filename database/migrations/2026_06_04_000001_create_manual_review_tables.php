<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('review_sources')) {
            Schema::create('review_sources', function (Blueprint $table) {
                $table->id();
                $table->string('provider')->default('manual');
                $table->string('name')->default('');
                $table->string('external_url')->default('');
                $table->string('api_key')->default('');
                $table->string('place_id')->default('');
                $table->string('business_unit_id')->default('');
                $table->boolean('enabled')->default(true);
                $table->timestamp('last_synced_at')->nullable();
                $table->text('oauth_access_token')->nullable();
                $table->text('oauth_refresh_token')->nullable();
                $table->timestamp('oauth_expires_at')->nullable();
                $table->string('oauth_account_name')->default('');
                $table->string('oauth_location_name')->default('');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('review_source_id')->nullable()->constrained('review_sources')->nullOnDelete();
                $table->string('provider')->default('manual');
                $table->string('external_id')->default('');
                $table->string('author_name');
                $table->string('author_image')->default('');
                $table->unsignedTinyInteger('rating')->default(5);
                $table->longText('content');
                $table->string('external_url')->default('');
                $table->string('reviewed_at')->default('');
                $table->boolean('is_featured')->default(true);
                $table->boolean('is_published')->default(true);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('review_sources');
    }
};
