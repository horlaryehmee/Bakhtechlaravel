<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_event_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->default(30);
            $table->unsignedSmallInteger('buffer_minutes')->default(15);
            $table->string('location_type')->default('google_meet');
            $table->string('location_label')->nullable();
            $table->string('timezone')->default('Africa/Lagos');
            $table->json('availability_json')->nullable();
            $table->unsignedSmallInteger('min_notice_hours')->default(4);
            $table->unsignedSmallInteger('max_future_days')->default(21);
            $table->unsignedSmallInteger('reminder_minutes_before')->default(60);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('bookings', function (Blueprint $table) {
            $table->foreignId('booking_event_type_id')->nullable()->after('id')->constrained('booking_event_types')->nullOnDelete();
            $table->string('timezone')->nullable()->after('scheduled_at');
            $table->dateTime('starts_at')->nullable()->after('timezone');
            $table->dateTime('ends_at')->nullable()->after('starts_at');
            $table->unsignedSmallInteger('duration_minutes')->default(30)->after('ends_at');
            $table->string('location_type')->nullable()->after('duration_minutes');
            $table->string('location_value')->nullable()->after('location_type');
            $table->string('google_calendar_event_id')->nullable()->after('location_value');
            $table->string('google_calendar_event_url')->nullable()->after('google_calendar_event_id');
            $table->string('google_calendar_sync_status')->default('not_configured')->after('google_calendar_event_url');
            $table->dateTime('reminder_sent_at')->nullable()->after('google_calendar_sync_status');
            $table->string('cancel_token')->nullable()->unique()->after('reminder_sent_at');
        });

        DB::table('booking_event_types')->insert([
            [
                'name' => 'Discovery Call',
                'slug' => 'discovery-call',
                'description' => 'A focused call to understand your business, website goals, budget, and best next step.',
                'duration_minutes' => 30,
                'buffer_minutes' => 15,
                'location_type' => 'google_meet',
                'location_label' => 'Google Meet',
                'timezone' => 'Africa/Lagos',
                'availability_json' => json_encode($this->defaultAvailability()),
                'min_notice_hours' => 4,
                'max_future_days' => 21,
                'reminder_minutes_before' => 60,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Project Strategy Session',
                'slug' => 'project-strategy-session',
                'description' => 'A deeper session for clients ready to plan a website, booking system, portal, or ecommerce build.',
                'duration_minutes' => 60,
                'buffer_minutes' => 15,
                'location_type' => 'google_meet',
                'location_label' => 'Google Meet',
                'timezone' => 'Africa/Lagos',
                'availability_json' => json_encode($this->defaultAvailability()),
                'min_notice_hours' => 8,
                'max_future_days' => 30,
                'reminder_minutes_before' => 120,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropForeign(['booking_event_type_id']);
            $table->dropColumn([
                'booking_event_type_id',
                'timezone',
                'starts_at',
                'ends_at',
                'duration_minutes',
                'location_type',
                'location_value',
                'google_calendar_event_id',
                'google_calendar_event_url',
                'google_calendar_sync_status',
                'reminder_sent_at',
                'cancel_token',
            ]);
        });

        Schema::dropIfExists('booking_event_types');
    }

    private function defaultAvailability(): array
    {
        return [
            'monday' => [['start' => '09:00', 'end' => '17:00']],
            'tuesday' => [['start' => '09:00', 'end' => '17:00']],
            'wednesday' => [['start' => '09:00', 'end' => '17:00']],
            'thursday' => [['start' => '09:00', 'end' => '17:00']],
            'friday' => [['start' => '09:00', 'end' => '15:00']],
            'saturday' => [],
            'sunday' => [],
        ];
    }
};
