<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('booking_calendars') || !Schema::hasTable('booking_event_types')) {
            return;
        }

        DB::table('booking_calendars')
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')
                    ->from('booking_event_types')
                    ->whereColumn('booking_event_types.booking_calendar_id', 'booking_calendars.id');
            })
            ->orderBy('id')
            ->get()
            ->each(function ($calendar) {
                DB::table('booking_event_types')->insert([
                    'booking_calendar_id' => $calendar->id,
                    'name' => $calendar->name,
                    'slug' => $this->uniqueSlug((string) $calendar->slug),
                    'description' => $calendar->description ?: '',
                    'duration_minutes' => 30,
                    'buffer_minutes' => 15,
                    'location_type' => 'google_meet',
                    'location_label' => 'Online meeting',
                    'timezone' => $calendar->timezone ?: 'Africa/Lagos',
                    'availability_json' => json_encode([
                        'monday' => [['start' => '09:00', 'end' => '17:00']],
                        'tuesday' => [['start' => '09:00', 'end' => '17:00']],
                        'wednesday' => [['start' => '09:00', 'end' => '17:00']],
                        'thursday' => [['start' => '09:00', 'end' => '17:00']],
                        'friday' => [['start' => '09:00', 'end' => '17:00']],
                    ]),
                    'min_notice_hours' => 4,
                    'max_future_days' => 30,
                    'reminder_minutes_before' => 60,
                    'price_amount' => 0,
                    'currency' => 'NGN',
                    'payment_required' => false,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
    }

    private function uniqueSlug(string $value): string
    {
        $base = Str::slug($value) ?: 'booking';
        $candidate = $base;
        $index = 2;

        while (DB::table('booking_event_types')->where('slug', $candidate)->exists()) {
            $candidate = $base . '-' . $index;
            $index++;
        }

        return $candidate;
    }
};
