<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('booking_settings')) {
            return;
        }

        foreach ($this->settings() as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
    }

    private function settings(): array
    {
        return [
            'google_oauth_client_id' => '',
            'google_oauth_client_secret' => '',
            'google_calendar_refresh_token' => '',
            'google_calendar_token_expires_at' => '',
            'google_connected_email' => '',
        ];
    }
};
