<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'payment_provider')) {
                $table->string('payment_provider')->nullable()->after('currency');
            }
            if (!Schema::hasColumn('bookings', 'payment_status')) {
                $table->string('payment_status')->default('unpaid')->after('payment_provider');
            }
            if (!Schema::hasColumn('bookings', 'payment_reference')) {
                $table->string('payment_reference')->nullable()->unique()->after('payment_status');
            }
            if (!Schema::hasColumn('bookings', 'payment_authorization_url')) {
                $table->text('payment_authorization_url')->nullable()->after('payment_reference');
            }
            if (!Schema::hasColumn('bookings', 'payment_access_code')) {
                $table->string('payment_access_code')->nullable()->after('payment_authorization_url');
            }
            if (!Schema::hasColumn('bookings', 'paid_at')) {
                $table->dateTime('paid_at')->nullable()->after('payment_access_code');
            }
        });

        foreach ($this->settings() as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn([
                'payment_provider',
                'payment_status',
                'payment_reference',
                'payment_authorization_url',
                'payment_access_code',
                'paid_at',
            ]);
        });
    }

    private function settings(): array
    {
        return [
            'payment_provider' => 'none',
            'paystack_enabled' => 'false',
            'paystack_mode' => 'test',
            'paystack_public_key' => '',
            'paystack_secret_key' => '',
            'paystack_callback_url' => '',
            'paystack_channels' => 'card,bank,ussd,bank_transfer',
        ];
    }
};
