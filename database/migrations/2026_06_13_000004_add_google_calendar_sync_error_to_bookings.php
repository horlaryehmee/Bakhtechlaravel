<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (! Schema::hasColumn('bookings', 'google_calendar_sync_error')) {
                $table->text('google_calendar_sync_error')->nullable()->after('google_calendar_sync_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (Schema::hasColumn('bookings', 'google_calendar_sync_error')) {
                $table->dropColumn('google_calendar_sync_error');
            }
        });
    }
};
