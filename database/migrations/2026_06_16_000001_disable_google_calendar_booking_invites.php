<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('booking_settings')) {
            return;
        }

        DB::table('booking_settings')->updateOrInsert(
            ['key' => 'google_calendar_send_updates'],
            ['value' => 'none', 'created_at' => now(), 'updated_at' => now()]
        );
    }

    public function down(): void
    {
    }
};
