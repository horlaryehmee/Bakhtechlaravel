<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->string('visitor_id', 80)->nullable()->after('id');
            $table->string('session_id', 80)->nullable()->after('visitor_id');
            $table->string('source', 160)->nullable()->after('referrer');
            $table->string('source_type', 30)->nullable()->after('source');
            $table->string('country', 80)->nullable()->after('ip');
            $table->string('city', 80)->nullable()->after('country');
            $table->string('device_type', 30)->nullable()->after('city');
            $table->string('browser', 60)->nullable()->after('device_type');
            $table->string('operating_system', 60)->nullable()->after('browser');
            $table->string('language', 20)->nullable()->after('operating_system');
            $table->unsignedSmallInteger('screen_width')->nullable()->after('language');
            $table->unsignedSmallInteger('screen_height')->nullable()->after('screen_width');
            $table->unsignedInteger('duration_seconds')->default(0)->after('screen_height');
            $table->timestamp('last_seen_at')->nullable()->after('duration_seconds');
            $table->index(['session_id', 'last_seen_at']);
            $table->index(['visitor_id', 'created_at']);
            $table->index(['country', 'created_at']);
            $table->index(['source_type', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->dropIndex(['session_id', 'last_seen_at']);
            $table->dropIndex(['visitor_id', 'created_at']);
            $table->dropIndex(['country', 'created_at']);
            $table->dropIndex(['source_type', 'created_at']);
            $table->dropColumn([
                'visitor_id', 'session_id', 'source', 'source_type', 'country', 'city',
                'device_type', 'browser', 'operating_system', 'language', 'screen_width',
                'screen_height', 'duration_seconds', 'last_seen_at',
            ]);
        });
    }
};
