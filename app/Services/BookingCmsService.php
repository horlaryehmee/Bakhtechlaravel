<?php

namespace App\Services;

use App\Repositories\BookingCmsRepository;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class BookingCmsService
{
    public function __construct(
        private BookingCmsRepository $repository,
        private BookingNotificationService $notifications
    )
    {
    }

    public function overview(): array
    {
        $now = now();
        $todayStart = $now->copy()->startOfDay();
        $todayEnd = $now->copy()->endOfDay();
        $weekStart = $now->copy()->startOfWeek();
        $weekEnd = $now->copy()->endOfWeek();
        $monthStart = $now->copy()->startOfMonth();
        $monthEnd = $now->copy()->endOfMonth();

        $base = DB::table('bookings');
        $pricingEnabled = $this->setting('pricing_enabled') === 'true';

        return [
            'totals' => [
                'today' => (clone $base)->whereBetween('starts_at', [$todayStart, $todayEnd])->count(),
                'week' => (clone $base)->whereBetween('starts_at', [$weekStart, $weekEnd])->count(),
                'month' => (clone $base)->whereBetween('starts_at', [$monthStart, $monthEnd])->count(),
                'upcoming' => (clone $base)->where('starts_at', '>=', $now)->whereNotIn('status', ['cancelled', 'completed', 'closed'])->count(),
                'completed' => (clone $base)->whereIn('status', ['completed', 'closed'])->count(),
                'cancelled' => (clone $base)->where('status', 'cancelled')->count(),
            ],
            'revenue' => [
                'enabled' => $pricingEnabled,
                'currency' => $this->setting('currency', 'NGN'),
                'today' => $pricingEnabled ? (float) (clone $base)->where('payment_status', 'paid')->whereBetween('starts_at', [$todayStart, $todayEnd])->sum('price_amount') : 0,
                'month' => $pricingEnabled ? (float) (clone $base)->where('payment_status', 'paid')->whereBetween('starts_at', [$monthStart, $monthEnd])->sum('price_amount') : 0,
            ],
            'calendarSnapshot' => $this->calendarView('weekly', $now->toDateString(), []),
            'recentActivity' => $this->repository->activity()->limit(15)->get()->map(fn ($row) => $this->activityShape($row)),
            'quickActions' => [
                ['key' => 'add_booking', 'label' => 'Add booking'],
                ['key' => 'block_date', 'label' => 'Block date'],
                ['key' => 'manage_availability', 'label' => 'Manage availability'],
            ],
        ];
    }

    public function paginatedCalendars(array $filters, int $perPage): LengthAwarePaginator
    {
        return $this->repository->calendars($filters)->paginate($perPage);
    }

    public function saveCalendar(array $data, ?int $id, object $admin, ?string $ip): array
    {
        return DB::transaction(function () use ($data, $id, $admin, $ip) {
            if ($id) {
                $this->repository->updateCalendar($id, $data);
                $calendarId = $id;
                $action = 'calendar.updated';
            } else {
                $calendarId = $this->repository->createCalendar($data);
                $this->ensureDefaultEventType($calendarId);
                $action = 'calendar.created';
            }

            if (array_key_exists('resources', $data) && is_array($data['resources'])) {
                $this->repository->replaceResources($calendarId, $data['resources']);
            }

            $this->audit($admin, $action, 'calendar', $calendarId, ['name' => $data['name']], $ip);

            return $this->calendarShape($this->repository->calendar($calendarId), true);
        });
    }

    private function ensureDefaultEventType(int $calendarId): void
    {
        if (DB::table('booking_event_types')->where('booking_calendar_id', $calendarId)->exists()) {
            return;
        }

        $calendar = DB::table('booking_calendars')->where('id', $calendarId)->first();
        if (!$calendar) {
            return;
        }

        $slug = $this->uniqueEventTypeSlug((string) $calendar->slug);

        DB::table('booking_event_types')->insert([
            'booking_calendar_id' => $calendarId,
            'name' => $calendar->name,
            'slug' => $slug,
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
    }

    private function uniqueEventTypeSlug(string $value): string
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

    public function deleteCalendar(int $id, object $admin, ?string $ip): void
    {
        DB::transaction(function () use ($id, $admin, $ip) {
            DB::table('booking_calendars')->where('id', $id)->update(['is_active' => false, 'updated_at' => now()]);
            $this->audit($admin, 'calendar.deactivated', 'calendar', $id, [], $ip);
        });
    }

    public function paginatedBookings(array $filters, int $perPage): LengthAwarePaginator
    {
        return $this->repository->bookings($filters)->paginate($perPage);
    }

    public function createBooking(array $data, object $admin, ?string $ip): array
    {
        $bookingId = null;
        $booking = DB::transaction(function () use ($data, $admin, $ip, &$bookingId) {
            $payload = $this->bookingPayload($data);
            if (!$this->isSlotAvailable($payload['booking_calendar_id'], $payload['starts_at'], $payload['ends_at'], null, $payload['booking_resource_id'])) {
                throw new HttpResponseException(response()->json(['message' => 'This booking conflicts with an existing booking, blackout date, or availability rule.'], 409));
            }

            $id = $this->repository->createBooking($payload);
            $bookingId = $id;
            $this->history($id, $admin, 'booking.created', null, $payload['status'], $payload);
            $this->audit($admin, 'booking.created', 'booking', $id, ['customer' => $payload['name']], $ip);

            return $this->bookingShape($this->repository->booking($id));
        });

        if ($bookingId) {
            $this->notifications->bookingCreated($bookingId);
        }

        return $booking;
    }

    public function updateBooking(int $id, array $data, object $admin, ?string $ip): array
    {
        return DB::transaction(function () use ($id, $data, $admin, $ip) {
            $existing = $this->repository->booking($id);
            if (!$existing) {
                abort(response()->json(['message' => 'Booking not found.'], 404));
            }

            $payload = $this->bookingPayload($data, $existing);
            if (!$this->isSlotAvailable($payload['booking_calendar_id'], $payload['starts_at'], $payload['ends_at'], $id, $payload['booking_resource_id'])) {
                throw new HttpResponseException(response()->json(['message' => 'This booking conflicts with an existing booking, blackout date, or availability rule.'], 409));
            }

            $this->repository->updateBooking($id, $payload);
            $this->history($id, $admin, 'booking.updated', $existing->status, $payload['status'], $payload);
            $this->audit($admin, 'booking.updated', 'booking', $id, ['customer' => $payload['name']], $ip);
            $this->sendStatusEmailIfNeeded($existing, (object) $payload);

            return $this->bookingShape($this->repository->booking($id));
        });
    }

    public function updateBookingStatus(int $id, string $status, object $admin, ?string $remarks, ?string $ip): array
    {
        $existing = $this->repository->booking($id);
        if (!$existing) {
            throw new HttpResponseException(response()->json(['message' => 'Booking not found.'], 404));
        }

        $allowed = ['pending', 'confirmed', 'completed', 'cancelled', 'open', 'contacted', 'closed'];
        if (!in_array($status, $allowed, true)) {
            throw new HttpResponseException(response()->json(['message' => 'Invalid booking status.'], 422));
        }

        $this->repository->updateBooking($id, [
            'status' => $status,
            'admin_remarks' => $remarks ?? $existing->admin_remarks,
        ]);
        $this->history($id, $admin, 'booking.status_changed', $existing->status, $status, ['remarks' => $remarks]);
        $this->audit($admin, 'booking.status_changed', 'booking', $id, ['from' => $existing->status, 'to' => $status], $ip);
        $this->sendStatusEmailIfNeeded($existing, (object) ['status' => $status, 'email' => $existing->email, 'name' => $existing->name]);

        return $this->bookingShape($this->repository->booking($id));
    }

    public function rescheduleBooking(int $id, string $startsAt, ?int $durationMinutes, object $admin, ?string $ip): array
    {
        $existing = $this->repository->booking($id);
        if (!$existing) {
            throw new HttpResponseException(response()->json(['message' => 'Booking not found.'], 404));
        }

        $timezone = $existing->timezone ?: $this->setting('timezone', 'Africa/Lagos');
        $start = Carbon::parse($startsAt, $timezone);
        $duration = $durationMinutes ?: (int) ($existing->duration_minutes ?: 30);
        $end = $start->copy()->addMinutes($duration);

        if (!$this->isSlotAvailable((int) $existing->booking_calendar_id, $start->toDateTimeString(), $end->toDateTimeString(), $id, $existing->booking_resource_id ? (int) $existing->booking_resource_id : null)) {
            throw new HttpResponseException(response()->json(['message' => 'The new time is not available.'], 409));
        }

        $this->repository->updateBooking($id, [
            'starts_at' => $start->toDateTimeString(),
            'ends_at' => $end->toDateTimeString(),
            'scheduled_at' => $start->toDateTimeString(),
            'duration_minutes' => $duration,
        ]);
        $this->history($id, $admin, 'booking.rescheduled', $existing->status, $existing->status, ['from' => $existing->starts_at, 'to' => $start->toDateTimeString()]);
        $this->audit($admin, 'booking.rescheduled', 'booking', $id, ['from' => $existing->starts_at, 'to' => $start->toDateTimeString()], $ip);

        return $this->bookingShape($this->repository->booking($id));
    }

    public function availabilityRules(array $filters = []): array
    {
        return DB::table('booking_availability_rules')
            ->when($filters['calendarId'] ?? null, fn ($query, $id) => $query->where('booking_calendar_id', (int) $id))
            ->when($filters['eventTypeId'] ?? null, fn ($query, $id) => $query->where('booking_event_type_id', (int) $id))
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get()
            ->map(fn ($row) => $this->availabilityRuleShape($row))
            ->all();
    }

    public function saveAvailabilityRule(array $data, ?int $id, object $admin, ?string $ip): array
    {
        $payload = [
            'booking_calendar_id' => $data['calendarId'] ?? null,
            'booking_event_type_id' => $data['eventTypeId'] ?? null,
            'name' => $data['name'] ?? 'Availability rule',
            'working_days_json' => json_encode($data['workingDays'] ?? []),
            'start_time' => $data['startTime'],
            'end_time' => $data['endTime'],
            'breaks_json' => json_encode($data['breaks'] ?? []),
            'recurrence' => $data['recurrence'] ?? 'weekly',
            'effective_from' => $data['effectiveFrom'] ?? null,
            'effective_until' => $data['effectiveUntil'] ?? null,
            'is_active' => (bool) ($data['isActive'] ?? true),
            'updated_at' => now(),
        ];

        if ($id) {
            DB::table('booking_availability_rules')->where('id', $id)->update($payload);
            $ruleId = $id;
            $action = 'availability.updated';
        } else {
            $payload['created_at'] = now();
            $ruleId = DB::table('booking_availability_rules')->insertGetId($payload);
            $action = 'availability.created';
        }

        $this->audit($admin, $action, 'availability_rule', $ruleId, ['name' => $payload['name']], $ip);

        return $this->availabilityRuleShape(DB::table('booking_availability_rules')->where('id', $ruleId)->first());
    }

    public function createBlackout(array $data, object $admin, ?string $ip): array
    {
        $id = DB::table('booking_blackouts')->insertGetId([
            'booking_calendar_id' => $data['calendarId'] ?? null,
            'title' => $data['title'],
            'starts_at' => Carbon::parse($data['startsAt'])->toDateTimeString(),
            'ends_at' => Carbon::parse($data['endsAt'])->toDateTimeString(),
            'reason' => $data['reason'] ?? '',
            'is_recurring' => (bool) ($data['isRecurring'] ?? false),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->audit($admin, 'blackout.created', 'blackout', $id, ['title' => $data['title']], $ip);

        return $this->blackoutShape(DB::table('booking_blackouts')->where('id', $id)->first());
    }

    public function checkAvailability(array $data): array
    {
        $calendarId = (int) $data['calendarId'];
        $start = Carbon::parse($data['startsAt']);
        $duration = (int) ($data['durationMinutes'] ?? 30);
        $end = $start->copy()->addMinutes($duration);
        $resourceId = isset($data['resourceId']) ? (int) $data['resourceId'] : null;

        return [
            'available' => $this->isSlotAvailable($calendarId, $start->toDateTimeString(), $end->toDateTimeString(), null, $resourceId),
            'startsAt' => $start->toIso8601String(),
            'endsAt' => $end->toIso8601String(),
            'calendarId' => $calendarId,
            'resourceId' => $resourceId,
        ];
    }

    public function settings(): array
    {
        $settings = array_merge([
            'google_oauth_client_id' => '',
            'google_oauth_client_secret' => '',
            'google_calendar_sync_enabled' => 'false',
            'google_calendar_id' => 'primary',
            'google_calendar_send_updates' => 'all',
            'google_meet_auto_generate' => 'true',
            'google_connected_email' => '',
        ], DB::table('booking_settings')->pluck('value', 'key')->all());
        foreach (['paystack_secret_key', 'google_oauth_client_secret', 'google_calendar_access_token', 'google_calendar_refresh_token', 'zoom_client_secret'] as $secretKey) {
            if (!empty($settings[$secretKey])) {
                $settings[$secretKey] = '********';
            }
        }

        return $settings;
    }

    public function updateSettings(array $settings, object $admin, ?string $ip): array
    {
        foreach ($settings as $key => $value) {
            if (in_array($key, ['paystack_secret_key', 'google_oauth_client_secret', 'google_calendar_access_token', 'google_calendar_refresh_token', 'zoom_client_secret'], true) && ((string) $value === '' || (string) $value === '********')) {
                continue;
            }

            DB::table('booking_settings')->updateOrInsert(
                ['key' => $key],
                ['value' => is_array($value) ? json_encode($value) : (string) $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $this->audit($admin, 'settings.updated', 'settings', null, ['keys' => array_keys($settings)], $ip);

        return $this->settings();
    }

    public function calendarView(string $view, string $date, array $filters): array
    {
        $anchor = Carbon::parse($date ?: now()->toDateString());
        [$from, $to] = match ($view) {
            'daily' => [$anchor->copy()->startOfDay(), $anchor->copy()->endOfDay()],
            'monthly' => [$anchor->copy()->startOfMonth(), $anchor->copy()->endOfMonth()],
            default => [$anchor->copy()->startOfWeek(), $anchor->copy()->endOfWeek()],
        };

        $bookings = $this->repository->bookings([
            ...$filters,
            'from' => $from->toDateTimeString(),
            'to' => $to->toDateTimeString(),
        ])->get()->map(fn ($row) => $this->bookingShape($row))->all();

        $blackouts = DB::table('booking_blackouts')
            ->where('starts_at', '<=', $to)
            ->where('ends_at', '>=', $from)
            ->when($filters['calendarId'] ?? null, fn ($query, $id) => $query->where(function ($inner) use ($id) {
                $inner->whereNull('booking_calendar_id')->orWhere('booking_calendar_id', (int) $id);
            }))
            ->get()
            ->map(fn ($row) => $this->blackoutShape($row))
            ->all();

        return [
            'view' => $view,
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'bookings' => $bookings,
            'blackouts' => $blackouts,
        ];
    }

    public function calendarShape(?object $calendar, bool $includeResources = false): ?array
    {
        if (!$calendar) {
            return null;
        }

        $shape = [
            'id' => $calendar->id,
            'name' => $calendar->name,
            'slug' => $calendar->slug,
            'description' => $calendar->description ?: '',
            'timezone' => $calendar->timezone,
            'color' => $calendar->color,
            'settings' => json_decode($calendar->settings_json ?: '{}', true) ?: [],
            'bookingCount' => DB::table('bookings')->where('booking_calendar_id', $calendar->id)->count(),
            'publicUrl' => '/book/' . $calendar->slug,
            'isActive' => (bool) $calendar->is_active,
            'createdAt' => (string) $calendar->created_at,
            'updatedAt' => (string) $calendar->updated_at,
        ];

        if ($includeResources) {
            $shape['resources'] = collect($this->repository->resources((int) $calendar->id))->map(fn ($row) => $this->resourceShape($row))->all();
        }

        return $shape;
    }

    public function bookingShape(?object $booking): ?array
    {
        if (!$booking) {
            return null;
        }

        return [
            'id' => $booking->id,
            'calendarId' => $booking->booking_calendar_id ?? null,
            'calendarName' => $booking->calendar_name ?? '',
            'resourceId' => $booking->booking_resource_id ?? null,
            'resourceName' => $booking->resource_name ?? '',
            'eventTypeId' => $booking->booking_event_type_id ?? null,
            'eventTypeName' => $booking->event_type_name ?? '',
            'customer' => [
                'name' => $booking->name,
                'email' => $booking->email ?: '',
                'phone' => $booking->phone ?: '',
            ],
            'serviceType' => $booking->service ?: '',
            'startsAt' => (string) ($booking->starts_at ?? $booking->scheduled_at),
            'endsAt' => (string) ($booking->ends_at ?? ''),
            'durationMinutes' => (int) ($booking->duration_minutes ?? 30),
            'timezone' => $booking->timezone ?? '',
            'attendeeTimezone' => $booking->attendee_timezone ?? ($booking->timezone ?? ''),
            'status' => $booking->status,
            'notes' => $booking->message ?: '',
            'adminRemarks' => $booking->admin_remarks ?? '',
            'priceAmount' => (float) ($booking->price_amount ?? 0),
            'currency' => $booking->currency ?? $this->setting('currency', 'NGN'),
            'payment' => [
                'provider' => $booking->payment_provider ?? '',
                'status' => $booking->payment_status ?? 'unpaid',
                'reference' => $booking->payment_reference ?? '',
                'authorizationUrl' => $booking->payment_authorization_url ?? '',
                'paidAt' => (string) ($booking->paid_at ?? ''),
            ],
            'location' => [
                'type' => $booking->location_type ?? '',
                'value' => $booking->location_value ?? '',
            ],
            'googleCalendar' => [
                'status' => $booking->google_calendar_sync_status ?? 'not_configured',
                'eventUrl' => $booking->google_calendar_event_url ?? '',
                'error' => Schema::hasColumn('bookings', 'google_calendar_sync_error') ? ($booking->google_calendar_sync_error ?? '') : '',
            ],
            'reminderSentAt' => (string) ($booking->reminder_sent_at ?? ''),
            'createdAt' => (string) $booking->created_at,
            'updatedAt' => (string) ($booking->updated_at ?? ''),
        ];
    }

    private function bookingPayload(array $data, ?object $existing = null): array
    {
        $timezone = $data['timezone'] ?? $existing?->timezone ?? $this->setting('timezone', 'Africa/Lagos');
        $start = Carbon::parse($data['startsAt'] ?? $existing?->starts_at, $timezone);
        $duration = (int) ($data['durationMinutes'] ?? $existing?->duration_minutes ?? 30);
        $end = isset($data['endsAt']) ? Carbon::parse($data['endsAt'], $timezone) : $start->copy()->addMinutes($duration);

        return [
            'booking_event_type_id' => $data['eventTypeId'] ?? $existing?->booking_event_type_id,
            'booking_calendar_id' => $data['calendarId'] ?? $existing?->booking_calendar_id,
            'booking_resource_id' => $data['resourceId'] ?? $existing?->booking_resource_id,
            'name' => $data['customerName'] ?? $data['name'] ?? $existing?->name,
            'email' => $data['email'] ?? $existing?->email ?? '',
            'phone' => $data['phone'] ?? $existing?->phone ?? '',
            'service' => $data['serviceType'] ?? $data['service'] ?? $existing?->service ?? '',
            'message' => $data['notes'] ?? $data['message'] ?? $existing?->message ?? '',
            'admin_remarks' => $data['adminRemarks'] ?? $existing?->admin_remarks ?? '',
            'status' => $data['status'] ?? $existing?->status ?? 'pending',
            'scheduled_at' => $start->toDateTimeString(),
            'timezone' => $timezone,
            ...$this->attendeeTimezonePayload((string) ($data['attendeeTimezone'] ?? $data['timezone'] ?? $existing?->attendee_timezone ?? $timezone)),
            'starts_at' => $start->toDateTimeString(),
            'ends_at' => $end->toDateTimeString(),
            'duration_minutes' => $duration,
            'price_amount' => (float) ($data['priceAmount'] ?? $existing?->price_amount ?? 0),
            'currency' => $data['currency'] ?? $existing?->currency ?? $this->setting('currency', 'NGN'),
            'location_type' => $data['locationType'] ?? $existing?->location_type ?? 'google_meet',
            'location_value' => $data['locationValue'] ?? $existing?->location_value ?? '',
            'google_calendar_sync_status' => $existing?->google_calendar_sync_status ?? 'not_configured',
            ...$this->googleCalendarSyncErrorPayload(
                $existing && Schema::hasColumn('bookings', 'google_calendar_sync_error')
                    ? ($existing->google_calendar_sync_error ?? null)
                    : null
            ),
            'cancel_token' => $existing?->cancel_token ?? (string) \Illuminate\Support\Str::uuid(),
        ];
    }

    private function isSlotAvailable(int $calendarId, string $startsAt, string $endsAt, ?int $ignoreBookingId = null, ?int $resourceId = null): bool
    {
        $start = Carbon::parse($startsAt);
        $end = Carbon::parse($endsAt);

        if (!$this->insideAvailability($calendarId, $start, $end)) {
            return false;
        }

        $blackoutExists = DB::table('booking_blackouts')
            ->where(function ($query) use ($calendarId) {
                $query->whereNull('booking_calendar_id')->orWhere('booking_calendar_id', $calendarId);
            })
            ->where('starts_at', '<', $end->toDateTimeString())
            ->where('ends_at', '>', $start->toDateTimeString())
            ->exists();

        if ($blackoutExists) {
            return false;
        }

        return !DB::table('bookings')
            ->where('booking_calendar_id', $calendarId)
            ->when($resourceId, fn ($query) => $query->where(function ($inner) use ($resourceId) {
                $inner->whereNull('booking_resource_id')->orWhere('booking_resource_id', $resourceId);
            }))
            ->when($ignoreBookingId, fn ($query) => $query->where('id', '!=', $ignoreBookingId))
            ->whereNotIn('status', ['cancelled', 'closed'])
            ->where('starts_at', '<', $end->toDateTimeString())
            ->where('ends_at', '>', $start->toDateTimeString())
            ->exists();
    }

    private function insideAvailability(int $calendarId, Carbon $start, Carbon $end): bool
    {
        $day = strtolower($start->englishDayOfWeek);
        $rules = DB::table('booking_availability_rules')
            ->where('is_active', true)
            ->where(function ($query) use ($calendarId) {
                $query->whereNull('booking_calendar_id')->orWhere('booking_calendar_id', $calendarId);
            })
            ->get();

        foreach ($rules as $rule) {
            $days = json_decode($rule->working_days_json ?: '[]', true);
            if (!in_array($day, $days ?: [], true)) {
                continue;
            }

            $windowStart = $start->copy()->setTimeFromTimeString($rule->start_time);
            $windowEnd = $start->copy()->setTimeFromTimeString($rule->end_time);
            if ($start->lessThan($windowStart) || $end->greaterThan($windowEnd)) {
                continue;
            }

            $breakConflict = collect(json_decode($rule->breaks_json ?: '[]', true))->contains(function ($break) use ($start, $end) {
                $breakStart = $start->copy()->setTimeFromTimeString($break['start']);
                $breakEnd = $start->copy()->setTimeFromTimeString($break['end']);
                return $start->lessThan($breakEnd) && $end->greaterThan($breakStart);
            });

            if (!$breakConflict) {
                return true;
            }
        }

        return false;
    }

    private function setting(string $key, ?string $fallback = null): ?string
    {
        return DB::table('booking_settings')->where('key', $key)->value('value') ?? $fallback;
    }

    private function attendeeTimezonePayload(string $timezone): array
    {
        return Schema::hasColumn('bookings', 'attendee_timezone') ? ['attendee_timezone' => $timezone] : [];
    }

    private function googleCalendarSyncErrorPayload(?string $error): array
    {
        return Schema::hasColumn('bookings', 'google_calendar_sync_error')
            ? ['google_calendar_sync_error' => $error]
            : [];
    }

    private function resourceShape(object $row): array
    {
        return [
            'id' => $row->id,
            'calendarId' => $row->booking_calendar_id,
            'type' => $row->type,
            'name' => $row->name,
            'email' => $row->email ?: '',
            'phone' => $row->phone ?: '',
            'description' => $row->description ?: '',
            'isActive' => (bool) $row->is_active,
        ];
    }

    private function availabilityRuleShape(object $row): array
    {
        return [
            'id' => $row->id,
            'calendarId' => $row->booking_calendar_id,
            'eventTypeId' => $row->booking_event_type_id,
            'name' => $row->name,
            'workingDays' => json_decode($row->working_days_json ?: '[]', true),
            'startTime' => substr((string) $row->start_time, 0, 5),
            'endTime' => substr((string) $row->end_time, 0, 5),
            'breaks' => json_decode($row->breaks_json ?: '[]', true),
            'recurrence' => $row->recurrence,
            'effectiveFrom' => (string) ($row->effective_from ?? ''),
            'effectiveUntil' => (string) ($row->effective_until ?? ''),
            'isActive' => (bool) $row->is_active,
        ];
    }

    private function blackoutShape(object $row): array
    {
        return [
            'id' => $row->id,
            'calendarId' => $row->booking_calendar_id,
            'title' => $row->title,
            'startsAt' => (string) $row->starts_at,
            'endsAt' => (string) $row->ends_at,
            'reason' => $row->reason ?: '',
            'isRecurring' => (bool) $row->is_recurring,
        ];
    }

    private function activityShape(object $row): array
    {
        return [
            'id' => $row->id,
            'adminId' => $row->admin_id,
            'actorName' => $row->actor_name ?: '',
            'action' => $row->action,
            'entityType' => $row->entity_type,
            'entityId' => $row->entity_id,
            'metadata' => json_decode($row->metadata_json ?: '{}', true),
            'createdAt' => (string) $row->created_at,
        ];
    }

    private function audit(object $admin, string $action, string $entityType, ?int $entityId, array $metadata, ?string $ip): void
    {
        DB::table('booking_activity_logs')->insert([
            'admin_id' => $admin->id,
            'actor_name' => $admin->name,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'metadata_json' => json_encode($metadata),
            'ip' => $ip,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function history(int $bookingId, object $admin, string $action, ?string $fromStatus, ?string $toStatus, array $changes): void
    {
        DB::table('booking_history_logs')->insert([
            'booking_id' => $bookingId,
            'admin_id' => $admin->id,
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'changes_json' => json_encode($changes),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function sendStatusEmailIfNeeded(object $existing, object $updated): void
    {
        if (($existing->status ?? null) === ($updated->status ?? null) || $this->setting('email_notifications_enabled') !== 'true' || !($existing->email ?? null)) {
            return;
        }

        Mail::raw(
            "Hello {$existing->name},\n\nYour booking status is now: {$updated->status}.",
            fn ($message) => $message
                ->to($existing->email)
                ->subject($this->setting('status_email_subject', 'Your booking status has changed'))
        );
    }
}
