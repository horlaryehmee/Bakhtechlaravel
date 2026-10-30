<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('crm_campaign_deliveries', function (Blueprint $table) {
            $table->string('tracking_token', 64)->nullable()->unique();
            $table->timestamp('tracked_at')->nullable();
            $table->timestamp('last_opened_at')->nullable()->index();
            $table->unsignedInteger('open_count')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('crm_campaign_deliveries', function (Blueprint $table) {
            $table->dropUnique(['tracking_token']);
            $table->dropIndex(['last_opened_at']);
            $table->dropColumn(['tracking_token', 'tracked_at', 'last_opened_at', 'open_count']);
        });
    }
};
