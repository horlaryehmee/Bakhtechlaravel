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
            'google_calendar_sync_enabled' => 'false',
            'google_calendar_id' => 'primary',
            'google_calendar_access_token' => '',
            'google_calendar_send_updates' => 'none',
            'google_meet_auto_generate' => 'true',
            'zoom_enabled' => 'false',
            'zoom_account_id' => '',
            'zoom_client_id' => '',
            'zoom_client_secret' => '',
            'zoom_user_id' => 'me',
            'zoom_auto_generate' => 'true',
        ];
    }
};
