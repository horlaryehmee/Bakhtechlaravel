<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('booking_calendars') || !Schema::hasColumn('booking_calendars', 'settings_json')) {
            return;
        }

        DB::table('booking_calendars')->orderBy('id')->get()->each(function ($calendar) {
            $settings = json_decode($calendar->settings_json ?: '{}', true);
            if (!is_array($settings)) {
                $settings = [];
            }

            if (!isset($settings['locations']) || !is_array($settings['locations'])) {
                $settings['locations'] = $this->defaultLocations();
                DB::table('booking_calendars')->where('id', $calendar->id)->update([
                    'settings_json' => json_encode($settings),
                    'updated_at' => now(),
                ]);
            }
        });
    }

    public function down(): void
    {
    }

    private function defaultLocations(): array
    {
        return [
            ['id' => 'google-meet', 'label' => 'Google Meet', 'type' => 'google_meet', 'details' => '', 'enabled' => true],
            ['id' => 'zoom', 'label' => 'Zoom', 'type' => 'zoom', 'details' => '', 'enabled' => true],
            ['id' => 'whatsapp-call', 'label' => 'WhatsApp Call', 'type' => 'whatsapp', 'details' => '', 'enabled' => true],
            ['id' => 'phone-call', 'label' => 'Phone Call', 'type' => 'phone', 'details' => '', 'enabled' => true],
            ['id' => 'in-person', 'label' => 'In Person', 'type' => 'in_person', 'details' => '', 'enabled' => false],
        ];
    }
};
