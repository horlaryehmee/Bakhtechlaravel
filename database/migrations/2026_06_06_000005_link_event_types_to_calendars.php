<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table) {
            if (!Schema::hasColumn('booking_event_types', 'booking_calendar_id')) {
                $table->foreignId('booking_calendar_id')->nullable()->after('id')->constrained('booking_calendars')->nullOnDelete();
            }
        });

        $defaultCalendarId = DB::table('booking_calendars')->orderBy('id')->value('id');
        if ($defaultCalendarId) {
            DB::table('booking_event_types')->whereNull('booking_calendar_id')->update([
                'booking_calendar_id' => $defaultCalendarId,
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table) {
            if (Schema::hasColumn('booking_event_types', 'booking_calendar_id')) {
                $table->dropForeign(['booking_calendar_id']);
                $table->dropColumn('booking_calendar_id');
            }
        });
    }
};
