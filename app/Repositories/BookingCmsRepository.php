<?php

namespace App\Repositories;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookingCmsRepository
{
    public function calendars(array $filters = []): Builder
    {
        return DB::table('booking_calendars')
            ->when(isset($filters['active']), fn ($query) => $query->where('is_active', (bool) $filters['active']))
            ->orderBy('name');
    }

    public function calendar(int $id): ?object
    {
        return DB::table('booking_calendars')->where('id', $id)->first();
    }

    public function createCalendar(array $data): int
    {
        return DB::table('booking_calendars')->insertGetId([
            'name' => $data['name'],
            'slug' => $this->uniqueSlug('booking_calendars', $data['slug'] ?? $data['name']),
            'description' => $data['description'] ?? '',
            'timezone' => $data['timezone'] ?? 'Africa/Lagos',
            'color' => $data['color'] ?? '#1261ff',
            'settings_json' => json_encode($data['settings'] ?? $this->defaultCalendarSettings()),
            'is_active' => (bool) ($data['isActive'] ?? true),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function updateCalendar(int $id, array $data): void
    {
        $payload = [
            'name' => $data['name'],
            'slug' => $this->uniqueSlug('booking_calendars', $data['slug'] ?? $data['name'], $id),
            'description' => $data['description'] ?? '',
            'timezone' => $data['timezone'] ?? 'Africa/Lagos',
            'color' => $data['color'] ?? '#1261ff',
            'is_active' => (bool) ($data['isActive'] ?? true),
            'updated_at' => now(),
        ];

        if (isset($data['settings']) && is_array($data['settings'])) {
            $payload['settings_json'] = json_encode($data['settings']);
        }

        DB::table('booking_calendars')->where('id', $id)->update($payload);
    }

    public function resources(int $calendarId): array
    {
        return DB::table('booking_resources')->where('booking_calendar_id', $calendarId)->orderBy('name')->get()->all();
    }

    public function replaceResources(int $calendarId, array $resources): void
    {
        DB::table('booking_resources')->where('booking_calendar_id', $calendarId)->delete();

        foreach ($resources as $resource) {
            DB::table('booking_resources')->insert([
                'booking_calendar_id' => $calendarId,
                'type' => $resource['type'] ?? 'staff',
                'name' => $resource['name'],
                'email' => $resource['email'] ?? null,
                'phone' => $resource['phone'] ?? null,
                'description' => $resource['description'] ?? null,
                'is_active' => (bool) ($resource['isActive'] ?? true),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function bookings(array $filters = []): Builder
    {
        return DB::table('bookings')
            ->leftJoin('booking_calendars', 'booking_calendars.id', '=', 'bookings.booking_calendar_id')
            ->leftJoin('booking_resources', 'booking_resources.id', '=', 'bookings.booking_resource_id')
            ->leftJoin('booking_event_types', 'booking_event_types.id', '=', 'bookings.booking_event_type_id')
            ->select(
                'bookings.*',
                'booking_calendars.name as calendar_name',
                'booking_resources.name as resource_name',
                'booking_event_types.name as event_type_name'
            )
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('bookings.status', $status))
            ->when($filters['calendarId'] ?? null, fn ($query, $id) => $query->where('bookings.booking_calendar_id', (int) $id))
            ->when($filters['resourceId'] ?? null, fn ($query, $id) => $query->where('bookings.booking_resource_id', (int) $id))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->where('bookings.starts_at', '>=', $from))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->where('bookings.starts_at', '<=', $to))
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('bookings.name', 'like', "%{$search}%")
                        ->orWhere('bookings.email', 'like', "%{$search}%")
                        ->orWhere('bookings.phone', 'like', "%{$search}%")
                        ->orWhere('bookings.service', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('bookings.starts_at')
            ->orderByDesc('bookings.created_at');
    }

    public function booking(int $id): ?object
    {
        return $this->bookings()->where('bookings.id', $id)->first();
    }

    public function createBooking(array $data): int
    {
        return DB::table('bookings')->insertGetId($data + [
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function updateBooking(int $id, array $data): void
    {
        DB::table('bookings')->where('id', $id)->update($data + ['updated_at' => now()]);
    }

    public function activity(array $filters = []): Builder
    {
        return DB::table('booking_activity_logs')
            ->when($filters['entityType'] ?? null, fn ($query, $type) => $query->where('entity_type', $type))
            ->when($filters['entityId'] ?? null, fn ($query, $id) => $query->where('entity_id', (int) $id))
            ->orderByDesc('created_at');
    }

    private function uniqueSlug(string $table, string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: $table . '-' . time();
        $candidate = $base;
        $index = 2;

        while (DB::table($table)->where('slug', $candidate)->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))->exists()) {
            $candidate = $base . '-' . $index;
            $index++;
        }

        return $candidate;
    }

    private function defaultCalendarSettings(): array
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
            'payment' => ['enabled' => false, 'pricingType' => 'fixed', 'amount' => 0, 'currency' => 'NGN', 'gateway' => 'paystack'],
            'email' => ['confirmationEnabled' => true, 'adminNotificationEnabled' => true, 'reminderMinutesBefore' => 1440],
            'availability' => ['timezone' => 'Africa/Lagos', 'workingDays' => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], 'startTime' => '09:00', 'endTime' => '17:00', 'bufferMinutes' => 15, 'blackoutDates' => []],
            'locations' => [
                ['id' => 'google-meet', 'label' => 'Google Meet', 'type' => 'google_meet', 'details' => '', 'enabled' => true],
                ['id' => 'zoom', 'label' => 'Zoom', 'type' => 'zoom', 'details' => '', 'enabled' => true],
                ['id' => 'whatsapp-call', 'label' => 'WhatsApp Call', 'type' => 'whatsapp', 'details' => '', 'enabled' => true],
                ['id' => 'phone-call', 'label' => 'Phone Call', 'type' => 'phone', 'details' => '', 'enabled' => true],
                ['id' => 'in-person', 'label' => 'In Person', 'type' => 'in_person', 'details' => '', 'enabled' => false],
            ],
        ];
    }
}
