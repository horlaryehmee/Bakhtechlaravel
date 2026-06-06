<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            if (!Schema::hasColumn('admins', 'role')) {
                $table->string('role')->default('admin')->after('name');
            }
        });

        Schema::create('booking_calendars', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('timezone')->default('Africa/Lagos');
            $table->string('color')->default('#1261ff');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('booking_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_calendar_id')->constrained('booking_calendars')->cascadeOnDelete();
            $table->string('type')->default('staff');
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['booking_calendar_id', 'type', 'is_active']);
        });

        Schema::create('booking_availability_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_calendar_id')->nullable()->constrained('booking_calendars')->cascadeOnDelete();
            $table->foreignId('booking_event_type_id')->nullable()->constrained('booking_event_types')->cascadeOnDelete();
            $table->string('name')->default('Default availability');
            $table->json('working_days_json');
            $table->time('start_time');
            $table->time('end_time');
            $table->json('breaks_json')->nullable();
            $table->string('recurrence')->default('weekly');
            $table->date('effective_from')->nullable();
            $table->date('effective_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['booking_calendar_id', 'is_active']);
            $table->index(['booking_event_type_id', 'is_active']);
        });

        Schema::create('booking_blackouts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_calendar_id')->nullable()->constrained('booking_calendars')->cascadeOnDelete();
            $table->string('title');
            $table->dateTime('starts_at');
            $table->dateTime('ends_at');
            $table->text('reason')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->timestamps();
            $table->index(['booking_calendar_id', 'starts_at', 'ends_at']);
        });

        Schema::create('booking_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('booking_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('actor_name')->nullable();
            $table->string('action');
            $table->string('entity_type');
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->json('metadata_json')->nullable();
            $table->string('ip')->nullable();
            $table->timestamps();
            $table->index(['entity_type', 'entity_id']);
            $table->index(['action', 'created_at']);
        });

        Schema::create('booking_history_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained('bookings')->cascadeOnDelete();
            $table->foreignId('admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->string('action');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->json('changes_json')->nullable();
            $table->timestamps();
            $table->index(['booking_id', 'created_at']);
        });

        Schema::table('bookings', function (Blueprint $table) {
            if (!Schema::hasColumn('bookings', 'booking_calendar_id')) {
                $table->foreignId('booking_calendar_id')->nullable()->after('booking_event_type_id')->constrained('booking_calendars')->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'booking_resource_id')) {
                $table->foreignId('booking_resource_id')->nullable()->after('booking_calendar_id')->constrained('booking_resources')->nullOnDelete();
            }
            if (!Schema::hasColumn('bookings', 'price_amount')) {
                $table->decimal('price_amount', 12, 2)->default(0)->after('duration_minutes');
            }
            if (!Schema::hasColumn('bookings', 'currency')) {
                $table->string('currency', 3)->default('NGN')->after('price_amount');
            }
            if (!Schema::hasColumn('bookings', 'admin_remarks')) {
                $table->longText('admin_remarks')->nullable()->after('message');
            }
        });

        $calendarId = DB::table('booking_calendars')->insertGetId([
            'name' => 'Main Consultation Calendar',
            'slug' => 'main-consultation-calendar',
            'description' => 'Default calendar for website consultation bookings.',
            'timezone' => 'Africa/Lagos',
            'color' => '#ef4444',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('booking_resources')->insert([
            'booking_calendar_id' => $calendarId,
            'type' => 'staff',
            'name' => 'Bakhtech Consultant',
            'email' => DB::table('settings')->where('key', 'contactEmail')->value('value') ?: 'solutions@bakhtech.com.ng',
            'phone' => DB::table('settings')->where('key', 'phone')->value('value') ?: '+234 708 637 2833',
            'description' => 'Default consultant resource.',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('booking_availability_rules')->insert([
            'booking_calendar_id' => $calendarId,
            'booking_event_type_id' => null,
            'name' => 'Business hours',
            'working_days_json' => json_encode(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
            'start_time' => '09:00',
            'end_time' => '17:00',
            'breaks_json' => json_encode([['start' => '13:00', 'end' => '14:00', 'label' => 'Lunch']]),
            'recurrence' => 'weekly',
            'effective_from' => now()->toDateString(),
            'effective_until' => null,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('booking_event_types')->update([
            'updated_at' => now(),
        ]);

        DB::table('bookings')->whereNull('booking_calendar_id')->update([
            'booking_calendar_id' => $calendarId,
            'updated_at' => now(),
        ]);

        foreach ($this->defaultSettings() as $key => $value) {
            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            foreach (['booking_calendar_id', 'booking_resource_id'] as $column) {
                if (Schema::hasColumn('bookings', $column)) {
                    $table->dropForeign([$column]);
                }
            }
            $table->dropColumn([
                'booking_calendar_id',
                'booking_resource_id',
                'price_amount',
                'currency',
                'admin_remarks',
            ]);
        });

        Schema::dropIfExists('booking_history_logs');
        Schema::dropIfExists('booking_activity_logs');
        Schema::dropIfExists('booking_settings');
        Schema::dropIfExists('booking_blackouts');
        Schema::dropIfExists('booking_availability_rules');
        Schema::dropIfExists('booking_resources');
        Schema::dropIfExists('booking_calendars');

        Schema::table('admins', function (Blueprint $table) {
            if (Schema::hasColumn('admins', 'role')) {
                $table->dropColumn('role');
            }
        });
    }

    private function defaultSettings(): array
    {
        return [
            'timezone' => 'Africa/Lagos',
            'date_format' => 'Y-m-d',
            'time_format' => 'H:i',
            'currency' => 'NGN',
            'pricing_enabled' => 'false',
            'minimum_notice_minutes' => '1440',
            'maximum_future_days' => '60',
            'maximum_bookings_per_day' => '12',
            'default_buffer_minutes' => '15',
            'admin_alert_email' => 'solutions@bakhtech.com.ng',
            'email_notifications_enabled' => 'true',
            'sms_notifications_enabled' => 'false',
            'google_calendar_sync_enabled' => 'false',
            'confirmation_email_subject' => 'Your booking is confirmed',
            'status_email_subject' => 'Your booking status has changed',
            'reminder_email_subject' => 'Reminder: your booking is coming up',
            'webhook_url' => '',
            'tenant_mode_enabled' => 'false',
            'api_rate_limit_per_minute' => '60',
        ];
    }
};
