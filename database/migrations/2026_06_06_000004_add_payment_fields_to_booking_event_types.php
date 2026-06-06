<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table) {
            if (!Schema::hasColumn('booking_event_types', 'price_amount')) {
                $table->decimal('price_amount', 12, 2)->default(0)->after('reminder_minutes_before');
            }
            if (!Schema::hasColumn('booking_event_types', 'currency')) {
                $table->string('currency', 3)->default('NGN')->after('price_amount');
            }
            if (!Schema::hasColumn('booking_event_types', 'payment_required')) {
                $table->boolean('payment_required')->default(false)->after('currency');
            }
        });
    }

    public function down(): void
    {
        Schema::table('booking_event_types', function (Blueprint $table) {
            $table->dropColumn(['price_amount', 'currency', 'payment_required']);
        });
    }
};
