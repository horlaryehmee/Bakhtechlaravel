<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_calendars', function (Blueprint $table) {
            if (!Schema::hasColumn('booking_calendars', 'settings_json')) {
                $table->json('settings_json')->nullable()->after('color');
            }
        });

        DB::table('booking_calendars')
            ->whereNull('settings_json')
            ->update([
                'settings_json' => json_encode($this->defaultSettings()),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        Schema::table('booking_calendars', function (Blueprint $table) {
            if (Schema::hasColumn('booking_calendars', 'settings_json')) {
                $table->dropColumn('settings_json');
            }
        });
    }

    private function defaultSettings(): array
    {
        return [
            'form' => [
                'fields' => [
                    ['key' => 'name', 'label' => 'Name', 'type' => 'text', 'enabled' => true, 'required' => true],
                    ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'enabled' => true, 'required' => true],
                    ['key' => 'phone', 'label' => 'Phone', 'type' => 'tel', 'enabled' => true, 'required' => false],
                ],
                'customFields' => [],
            ],
            'payment' => [
                'enabled' => false,
                'pricingType' => 'fixed',
                'amount' => 0,
                'currency' => 'NGN',
                'gateway' => 'paystack',
            ],
            'email' => [
                'confirmationEnabled' => true,
                'adminNotificationEnabled' => true,
                'reminderMinutesBefore' => 1440,
                'confirmationTemplate' => "Hello {{name}}, your booking is confirmed for {{time}}.",
                'adminTemplate' => "New booking from {{name}} for {{time}}.",
            ],
            'availability' => [
                'timezone' => 'Africa/Lagos',
                'workingDays' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                'startTime' => '09:00',
                'endTime' => '17:00',
                'bufferMinutes' => 15,
                'blackoutDates' => [],
            ],
            'locations' => [
                ['id' => 'google-meet', 'label' => 'Google Meet', 'type' => 'google_meet', 'details' => '', 'enabled' => true],
                ['id' => 'zoom', 'label' => 'Zoom', 'type' => 'zoom', 'details' => '', 'enabled' => true],
                ['id' => 'whatsapp-call', 'label' => 'WhatsApp Call', 'type' => 'whatsapp', 'details' => '', 'enabled' => true],
                ['id' => 'phone-call', 'label' => 'Phone Call', 'type' => 'phone', 'details' => '', 'enabled' => true],
                ['id' => 'in-person', 'label' => 'In Person', 'type' => 'in_person', 'details' => '', 'enabled' => false],
            ],
        ];
    }
};
