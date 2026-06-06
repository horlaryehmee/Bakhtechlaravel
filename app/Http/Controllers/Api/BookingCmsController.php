<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BookingCmsService;
use App\Services\GoogleCalendarOAuthService;
use App\Services\PaystackPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BookingCmsController extends Controller
{
    public function __construct(private BookingCmsService $service)
    {
    }

    public function overview()
    {
        return $this->service->overview();
    }

    public function calendars(Request $request)
    {
        $perPage = min(100, max(1, (int) $request->input('perPage', 20)));
        $page = $this->service->paginatedCalendars([
            'active' => $request->has('active') ? $request->boolean('active') : null,
        ], $perPage);

        return [
            'data' => collect($page->items())->map(fn ($row) => $this->service->calendarShape($row, true)),
            'meta' => $this->paginationMeta($page),
        ];
    }

    public function eventTypes(Request $request)
    {
        return [
            'data' => DB::table('booking_event_types')
                ->when($request->input('calendarId'), fn ($query, $id) => $query->where('booking_calendar_id', (int) $id))
                ->when($request->has('active'), fn ($query) => $query->where('is_active', $request->boolean('active')))
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->eventTypeShape($row)),
        ];
    }

    public function createEventType(Request $request)
    {
        $data = $this->validateEventType($request);
        $id = DB::table('booking_event_types')->insertGetId($this->eventTypePayload($data) + [
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['eventType' => $this->eventTypeShape(DB::table('booking_event_types')->where('id', $id)->first())], 201);
    }

    public function updateEventType(Request $request, int $id)
    {
        if (!DB::table('booking_event_types')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Event type not found.'], 404);
        }

        $data = $this->validateEventType($request, $id);
        DB::table('booking_event_types')->where('id', $id)->update($this->eventTypePayload($data) + ['updated_at' => now()]);

        return ['eventType' => $this->eventTypeShape(DB::table('booking_event_types')->where('id', $id)->first())];
    }

    public function calendar(int $id)
    {
        $calendar = DB::table('booking_calendars')->where('id', $id)->first();
        if (!$calendar) {
            return response()->json(['message' => 'Calendar not found.'], 404);
        }

        return ['calendar' => $this->service->calendarShape($calendar, true)];
    }

    public function createCalendar(Request $request)
    {
        $data = $this->validateCalendar($request);

        return response()->json([
            'calendar' => $this->service->saveCalendar($data, null, $this->admin($request), $request->ip()),
        ], 201);
    }

    public function updateCalendar(Request $request, int $id)
    {
        if (!DB::table('booking_calendars')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Calendar not found.'], 404);
        }

        $data = $this->validateCalendar($request, $id);

        return ['calendar' => $this->service->saveCalendar($data, $id, $this->admin($request), $request->ip())];
    }

    public function deleteCalendar(Request $request, int $id)
    {
        if (!DB::table('booking_calendars')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Calendar not found.'], 404);
        }

        $this->service->deleteCalendar($id, $this->admin($request), $request->ip());

        return response()->noContent();
    }

    public function bookings(Request $request)
    {
        $perPage = min(100, max(1, (int) $request->input('perPage', 20)));
        $page = $this->service->paginatedBookings([
            'status' => $request->input('status'),
            'calendarId' => $request->input('calendarId'),
            'resourceId' => $request->input('resourceId'),
            'from' => $request->input('from'),
            'to' => $request->input('to'),
            'search' => $request->input('search'),
        ], $perPage);

        return [
            'data' => collect($page->items())->map(fn ($row) => $this->service->bookingShape($row)),
            'meta' => $this->paginationMeta($page),
        ];
    }

    public function booking(int $id)
    {
        $row = DB::table('bookings')->where('id', $id)->first();
        if (!$row) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        $full = app(\App\Repositories\BookingCmsRepository::class)->booking($id);

        return ['booking' => $this->service->bookingShape($full)];
    }

    public function createBooking(Request $request)
    {
        $data = $this->validateBooking($request);

        return response()->json([
            'booking' => $this->service->createBooking($data, $this->admin($request), $request->ip()),
        ], 201);
    }

    public function updateBooking(Request $request, int $id)
    {
        $data = $this->validateBooking($request, true);

        return ['booking' => $this->service->updateBooking($id, $data, $this->admin($request), $request->ip())];
    }

    public function updateBookingStatus(Request $request, int $id)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'confirmed', 'completed', 'cancelled', 'open', 'contacted', 'closed'])],
            'adminRemarks' => ['nullable', 'string'],
        ]);

        return ['booking' => $this->service->updateBookingStatus($id, $data['status'], $this->admin($request), $data['adminRemarks'] ?? null, $request->ip())];
    }

    public function rescheduleBooking(Request $request, int $id)
    {
        $data = $request->validate([
            'startsAt' => ['required', 'date'],
            'durationMinutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
        ]);

        return ['booking' => $this->service->rescheduleBooking($id, $data['startsAt'], $data['durationMinutes'] ?? null, $this->admin($request), $request->ip())];
    }

    public function cancelBooking(Request $request, int $id)
    {
        $data = $request->validate([
            'adminRemarks' => ['nullable', 'string'],
        ]);

        return ['booking' => $this->service->updateBookingStatus($id, 'cancelled', $this->admin($request), $data['adminRemarks'] ?? null, $request->ip())];
    }

    public function availability(Request $request)
    {
        return [
            'rules' => $this->service->availabilityRules([
                'calendarId' => $request->input('calendarId'),
                'eventTypeId' => $request->input('eventTypeId'),
            ]),
            'blackouts' => DB::table('booking_blackouts')
                ->when($request->input('calendarId'), fn ($query, $id) => $query->where(function ($inner) use ($id) {
                    $inner->whereNull('booking_calendar_id')->orWhere('booking_calendar_id', (int) $id);
                }))
                ->orderByDesc('starts_at')
                ->limit(200)
                ->get()
                ->map(fn ($row) => [
                    'id' => $row->id,
                    'calendarId' => $row->booking_calendar_id,
                    'title' => $row->title,
                    'startsAt' => (string) $row->starts_at,
                    'endsAt' => (string) $row->ends_at,
                    'reason' => $row->reason ?: '',
                    'isRecurring' => (bool) $row->is_recurring,
                ]),
        ];
    }

    public function saveAvailability(Request $request)
    {
        $data = $request->validate([
            'id' => ['nullable', 'integer', 'exists:booking_availability_rules,id'],
            'calendarId' => ['nullable', 'integer', 'exists:booking_calendars,id'],
            'eventTypeId' => ['nullable', 'integer', 'exists:booking_event_types,id'],
            'name' => ['nullable', 'string', 'max:255'],
            'workingDays' => ['required', 'array'],
            'workingDays.*' => ['required', Rule::in(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])],
            'startTime' => ['required', 'date_format:H:i'],
            'endTime' => ['required', 'date_format:H:i', 'after:startTime'],
            'breaks' => ['nullable', 'array'],
            'breaks.*.start' => ['required_with:breaks', 'date_format:H:i'],
            'breaks.*.end' => ['required_with:breaks', 'date_format:H:i'],
            'breaks.*.label' => ['nullable', 'string', 'max:100'],
            'recurrence' => ['nullable', Rule::in(['weekly', 'date_range'])],
            'effectiveFrom' => ['nullable', 'date'],
            'effectiveUntil' => ['nullable', 'date', 'after_or_equal:effectiveFrom'],
            'isActive' => ['nullable', 'boolean'],
        ]);

        return [
            'rule' => $this->service->saveAvailabilityRule($data, $data['id'] ?? null, $this->admin($request), $request->ip()),
        ];
    }

    public function createBlackout(Request $request)
    {
        $data = $request->validate([
            'calendarId' => ['nullable', 'integer', 'exists:booking_calendars,id'],
            'title' => ['required', 'string', 'max:255'],
            'startsAt' => ['required', 'date'],
            'endsAt' => ['required', 'date', 'after:startsAt'],
            'reason' => ['nullable', 'string'],
            'isRecurring' => ['nullable', 'boolean'],
        ]);

        return response()->json([
            'blackout' => $this->service->createBlackout($data, $this->admin($request), $request->ip()),
        ], 201);
    }

    public function checkAvailability(Request $request)
    {
        $data = $request->validate([
            'calendarId' => ['required', 'integer', 'exists:booking_calendars,id'],
            'resourceId' => ['nullable', 'integer', 'exists:booking_resources,id'],
            'startsAt' => ['required', 'date'],
            'durationMinutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
        ]);

        return $this->service->checkAvailability($data);
    }

    public function settings()
    {
        return ['settings' => $this->service->settings()];
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate([
            'timezone' => ['sometimes', 'string', 'max:100'],
            'date_format' => ['sometimes', 'string', 'max:50'],
            'time_format' => ['sometimes', 'string', 'max:50'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'pricing_enabled' => ['sometimes'],
            'minimum_notice_minutes' => ['sometimes', 'integer', 'min:0'],
            'maximum_future_days' => ['sometimes', 'integer', 'min:1'],
            'maximum_bookings_per_day' => ['sometimes', 'integer', 'min:1'],
            'default_buffer_minutes' => ['sometimes', 'integer', 'min:0'],
            'admin_alert_email' => ['sometimes', 'email'],
            'email_notifications_enabled' => ['sometimes'],
            'sms_notifications_enabled' => ['sometimes'],
            'google_calendar_sync_enabled' => ['sometimes'],
            'google_oauth_client_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'google_oauth_client_secret' => ['sometimes', 'nullable', 'string'],
            'google_calendar_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'google_calendar_access_token' => ['sometimes', 'nullable', 'string'],
            'google_calendar_refresh_token' => ['sometimes', 'nullable', 'string'],
            'google_calendar_token_expires_at' => ['sometimes', 'nullable', 'string'],
            'google_connected_email' => ['sometimes', 'nullable', 'string', 'max:255'],
            'google_calendar_send_updates' => ['sometimes', Rule::in(['all', 'externalOnly', 'none'])],
            'google_meet_auto_generate' => ['sometimes'],
            'zoom_enabled' => ['sometimes'],
            'zoom_account_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'zoom_client_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'zoom_client_secret' => ['sometimes', 'nullable', 'string'],
            'zoom_user_id' => ['sometimes', 'nullable', 'string', 'max:255'],
            'zoom_auto_generate' => ['sometimes'],
            'payment_provider' => ['sometimes', Rule::in(['none', 'paystack'])],
            'paystack_enabled' => ['sometimes'],
            'paystack_mode' => ['sometimes', Rule::in(['test', 'live'])],
            'paystack_public_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'paystack_secret_key' => ['sometimes', 'nullable', 'string', 'max:255'],
            'paystack_callback_url' => ['sometimes', 'nullable', 'url'],
            'paystack_channels' => ['sometimes', 'nullable', 'string', 'max:255'],
            'confirmation_email_subject' => ['sometimes', 'string', 'max:255'],
            'status_email_subject' => ['sometimes', 'string', 'max:255'],
            'reminder_email_subject' => ['sometimes', 'string', 'max:255'],
            'webhook_url' => ['sometimes', 'nullable', 'url'],
            'tenant_mode_enabled' => ['sometimes'],
            'api_rate_limit_per_minute' => ['sometimes', 'integer', 'min:1', 'max:1000'],
        ]);

        return ['settings' => $this->service->updateSettings($data, $this->admin($request), $request->ip())];
    }

    public function googleOauthUrl(Request $request, GoogleCalendarOAuthService $google)
    {
        return ['google' => $google->authorizationUrl((int) $this->admin($request)->id)];
    }

    public function googleCalendars(GoogleCalendarOAuthService $google)
    {
        return ['calendars' => $google->calendars()];
    }

    public function selectGoogleCalendar(Request $request, GoogleCalendarOAuthService $google)
    {
        $data = $request->validate([
            'calendarId' => ['required', 'string', 'max:255'],
        ]);

        $google->selectCalendar($data['calendarId']);

        return ['settings' => $this->service->settings(), 'calendars' => $google->calendars()];
    }

    public function googleCallback(Request $request, GoogleCalendarOAuthService $google)
    {
        $ok = $request->filled('code') && $request->filled('state') && $google->handleCallback((string) $request->input('code'), (string) $request->input('state'));
        $status = $ok ? 'connected' : 'failed';

        return redirect('/admin/dashboard?booking_google=' . $status);
    }

    public function initializePaystackPayment(Request $request, PaystackPaymentService $paystack)
    {
        $data = $request->validate([
            'bookingId' => ['required', 'integer', 'exists:bookings,id'],
            'email' => ['required', 'email'],
        ]);

        return ['payment' => $paystack->initialize((int) $data['bookingId'], $data['email'])];
    }

    public function verifyPaystackPayment(Request $request, PaystackPaymentService $paystack)
    {
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:255'],
        ]);

        return ['payment' => $paystack->verify($data['reference'])];
    }

    public function calendarView(Request $request)
    {
        $data = $request->validate([
            'view' => ['nullable', Rule::in(['daily', 'weekly', 'monthly'])],
            'date' => ['nullable', 'date'],
            'calendarId' => ['nullable', 'integer', 'exists:booking_calendars,id'],
            'resourceId' => ['nullable', 'integer', 'exists:booking_resources,id'],
        ]);

        return $this->service->calendarView($data['view'] ?? 'weekly', $data['date'] ?? now()->toDateString(), $data);
    }

    public function activity(Request $request)
    {
        $perPage = min(100, max(1, (int) $request->input('perPage', 20)));
        $page = DB::table('booking_activity_logs')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return [
            'data' => collect($page->items())->map(fn ($row) => [
                'id' => $row->id,
                'actorName' => $row->actor_name ?: '',
                'action' => $row->action,
                'entityType' => $row->entity_type,
                'entityId' => $row->entity_id,
                'metadata' => json_decode($row->metadata_json ?: '{}', true),
                'createdAt' => (string) $row->created_at,
            ]),
            'meta' => $this->paginationMeta($page),
        ];
    }

    private function validateCalendar(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('booking_calendars', 'slug')->ignore($id)],
            'description' => ['nullable', 'string'],
            'timezone' => ['required', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:20'],
            'isActive' => ['nullable', 'boolean'],
            'settings' => ['nullable', 'array'],
            'resources' => ['nullable', 'array'],
            'resources.*.type' => ['nullable', Rule::in(['staff', 'room', 'service', 'property', 'equipment'])],
            'resources.*.name' => ['required_with:resources', 'string', 'max:255'],
            'resources.*.email' => ['nullable', 'email'],
            'resources.*.phone' => ['nullable', 'string', 'max:50'],
            'resources.*.description' => ['nullable', 'string'],
            'resources.*.isActive' => ['nullable', 'boolean'],
        ]);
    }

    private function validateEventType(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'calendarId' => ['nullable', 'integer', 'exists:booking_calendars,id'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('booking_event_types', 'slug')->ignore($id)],
            'description' => ['nullable', 'string'],
            'durationMinutes' => ['required', 'integer', 'min:5', 'max:1440'],
            'bufferMinutes' => ['nullable', 'integer', 'min:0', 'max:240'],
            'locationType' => ['nullable', Rule::in(['google_meet', 'phone', 'physical', 'custom'])],
            'locationLabel' => ['nullable', 'string', 'max:255'],
            'timezone' => ['required', 'string', 'max:100'],
            'minNoticeHours' => ['nullable', 'integer', 'min:0', 'max:720'],
            'maxFutureDays' => ['nullable', 'integer', 'min:1', 'max:365'],
            'reminderMinutesBefore' => ['nullable', 'integer', 'min:0', 'max:10080'],
            'priceAmount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'paymentRequired' => ['nullable', 'boolean'],
            'isActive' => ['nullable', 'boolean'],
        ]);
    }

    private function eventTypePayload(array $data): array
    {
        $slug = trim((string) ($data['slug'] ?? ''));

        return [
            'name' => $data['name'],
            'booking_calendar_id' => $data['calendarId'] ?? null,
            'slug' => $slug !== '' ? $slug : \Illuminate\Support\Str::slug($data['name']),
            'description' => $data['description'] ?? '',
            'duration_minutes' => (int) $data['durationMinutes'],
            'buffer_minutes' => (int) ($data['bufferMinutes'] ?? 15),
            'location_type' => $data['locationType'] ?? 'google_meet',
            'location_label' => $data['locationLabel'] ?? 'Google Meet',
            'timezone' => $data['timezone'] ?? 'Africa/Lagos',
            'min_notice_hours' => (int) ($data['minNoticeHours'] ?? 4),
            'max_future_days' => (int) ($data['maxFutureDays'] ?? 30),
            'reminder_minutes_before' => (int) ($data['reminderMinutesBefore'] ?? 60),
            'price_amount' => (float) ($data['priceAmount'] ?? 0),
            'currency' => $data['currency'] ?? 'NGN',
            'payment_required' => (bool) ($data['paymentRequired'] ?? false),
            'is_active' => (bool) ($data['isActive'] ?? true),
        ];
    }

    private function eventTypeShape(object $row): array
    {
        return [
            'id' => $row->id,
            'calendarId' => $row->booking_calendar_id ?? null,
            'name' => $row->name,
            'slug' => $row->slug,
            'description' => $row->description ?: '',
            'durationMinutes' => (int) $row->duration_minutes,
            'bufferMinutes' => (int) $row->buffer_minutes,
            'locationType' => $row->location_type,
            'locationLabel' => $row->location_label ?: '',
            'timezone' => $row->timezone,
            'minNoticeHours' => (int) $row->min_notice_hours,
            'maxFutureDays' => (int) $row->max_future_days,
            'reminderMinutesBefore' => (int) $row->reminder_minutes_before,
            'priceAmount' => (float) ($row->price_amount ?? 0),
            'currency' => $row->currency ?? 'NGN',
            'paymentRequired' => (bool) ($row->payment_required ?? false),
            'isActive' => (bool) $row->is_active,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function validateBooking(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'eventTypeId' => ['nullable', 'integer', 'exists:booking_event_types,id'],
            'calendarId' => [$required, 'integer', 'exists:booking_calendars,id'],
            'resourceId' => ['nullable', 'integer', 'exists:booking_resources,id'],
            'customerName' => [$required, 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'email' => [$required, 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'serviceType' => [$required, 'string', 'max:255'],
            'service' => ['nullable', 'string', 'max:255'],
            'startsAt' => [$required, 'date'],
            'endsAt' => ['nullable', 'date', 'after:startsAt'],
            'durationMinutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'timezone' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(['pending', 'confirmed', 'completed', 'cancelled', 'open', 'contacted', 'closed'])],
            'notes' => ['nullable', 'string'],
            'message' => ['nullable', 'string'],
            'adminRemarks' => ['nullable', 'string'],
            'priceAmount' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'locationType' => ['nullable', 'string', 'max:100'],
            'locationValue' => ['nullable', 'string', 'max:500'],
        ]);
    }

    private function admin(Request $request): object
    {
        return $request->attributes->get('admin');
    }

    private function paginationMeta($page): array
    {
        return [
            'currentPage' => $page->currentPage(),
            'perPage' => $page->perPage(),
            'total' => $page->total(),
            'lastPage' => $page->lastPage(),
        ];
    }
}
