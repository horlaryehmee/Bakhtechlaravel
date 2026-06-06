# Booking Management CMS Backend

## Architecture

The booking backend is API-driven and organized around a Laravel Controller -> Service -> Repository flow.

- `app/Http/Controllers/Api/BookingCmsController.php`: validates requests and returns REST responses.
- `app/Services/BookingCmsService.php`: owns booking business rules, analytics, conflict checks, availability checks, activity logging, status updates, reminders, and settings.
- `app/Repositories/BookingCmsRepository.php`: owns database query builders for calendars, resources, bookings, and activity logs.
- `app/Http/Middleware/RequireAdminToken.php`: bearer-token authentication.
- `app/Http/Middleware/RequireAdminRole.php`: RBAC for `admin`, `manager`, `staff`, and `viewer`.
- `database/migrations/2026_06_06_000002_create_booking_cms_tables.php`: normalized booking CMS tables.

## Database Schema

Core tables:

- `booking_calendars`: calendars for staff, rooms, services, properties, or other schedulable units.
- `booking_resources`: resources assigned to calendars.
- `booking_event_types`: public/internal booking types such as discovery calls and strategy sessions.
- `bookings`: customer booking records with calendar/resource assignment, times, status, pricing, location, Google Calendar metadata, and admin remarks.
- `booking_availability_rules`: working days, hours, breaks, recurrence, per-calendar and per-event rules.
- `booking_blackouts`: holidays, maintenance windows, blocked dates.
- `booking_settings`: booking-specific settings such as timezone, currency, notice period, notification toggles, templates, and API limits.
- `booking_activity_logs`: audit log for admin actions.
- `booking_history_logs`: per-booking lifecycle log.
- `admins.role`: RBAC role.

## Auth

Use bearer-token auth.

```http
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
```

Login payload:

```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```

Authenticated requests:

```http
Authorization: Bearer {token}
```

## Booking CMS Endpoints

All routes below are under `/api/admin/booking` and require auth.

Dashboard:

```http
GET /dashboard/overview
```

Calendars:

```http
GET /calendars?active=true&perPage=20
POST /calendars
GET /calendars/{id}
PUT /calendars/{id}
DELETE /calendars/{id}
```

Event types:

```http
GET /event-types?calendarId=1
POST /event-types
PUT /event-types/{id}
```

Event types are the individual booking options shown under a calendar host, for example "Discovery Call" or "Project Strategy Session".

Create/update calendar payload:

```json
{
  "name": "Design Team Calendar",
  "slug": "design-team",
  "description": "Consultations handled by the design team.",
  "timezone": "Africa/Lagos",
  "color": "#ef4444",
  "isActive": true,
  "resources": [
    {
      "type": "staff",
      "name": "Lead Designer",
      "email": "designer@example.com",
      "phone": "+2340000000000",
      "description": "Primary consultation owner",
      "isActive": true
    }
  ]
}
```

Bookings:

```http
GET /bookings?status=confirmed&calendarId=1&from=2026-06-01&to=2026-06-30&search=client&perPage=20
POST /bookings
GET /bookings/{id}
PUT /bookings/{id}
PUT /bookings/{id}/status
POST /bookings/{id}/reschedule
POST /bookings/{id}/cancel
```

Create booking payload:

```json
{
  "eventTypeId": 1,
  "calendarId": 1,
  "resourceId": 1,
  "customerName": "Jane Client",
  "email": "jane@example.com",
  "phone": "+2340000000000",
  "serviceType": "Discovery Call",
  "startsAt": "2026-06-09T10:00:00+01:00",
  "durationMinutes": 30,
  "timezone": "Africa/Lagos",
  "status": "confirmed",
  "notes": "Wants a booking website.",
  "adminRemarks": "High priority",
  "priceAmount": 50000,
  "currency": "NGN",
  "locationType": "google_meet",
  "locationValue": ""
}
```

Status update payload:

```json
{
  "status": "completed",
  "adminRemarks": "Client attended and proposal was sent."
}
```

Reschedule payload:

```json
{
  "startsAt": "2026-06-10T14:00:00+01:00",
  "durationMinutes": 60
}
```

Availability:

```http
GET /availability?calendarId=1
POST /availability
POST /availability/blackouts
POST /availability/check
```

Availability rule payload:

```json
{
  "calendarId": 1,
  "eventTypeId": null,
  "name": "Weekday hours",
  "workingDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
  "startTime": "09:00",
  "endTime": "17:00",
  "breaks": [
    { "start": "13:00", "end": "14:00", "label": "Lunch" }
  ],
  "recurrence": "weekly",
  "effectiveFrom": "2026-06-01",
  "effectiveUntil": null,
  "isActive": true
}
```

Blackout payload:

```json
{
  "calendarId": 1,
  "title": "Maintenance day",
  "startsAt": "2026-06-12T00:00:00+01:00",
  "endsAt": "2026-06-12T23:59:00+01:00",
  "reason": "Internal work",
  "isRecurring": false
}
```

Availability check payload:

```json
{
  "calendarId": 1,
  "resourceId": 1,
  "startsAt": "2026-06-09T10:00:00+01:00",
  "durationMinutes": 30
}
```

Settings:

```http
GET /settings
PUT /settings
```

Settings payload:

```json
{
  "timezone": "Africa/Lagos",
  "date_format": "Y-m-d",
  "currency": "NGN",
  "pricing_enabled": "true",
  "minimum_notice_minutes": 1440,
  "maximum_bookings_per_day": 12,
  "default_buffer_minutes": 15,
  "email_notifications_enabled": "true",
  "sms_notifications_enabled": "false",
  "admin_alert_email": "solutions@bakhtech.com.ng",
  "google_calendar_sync_enabled": "false"
}
```

Paystack settings:

```json
{
  "payment_provider": "paystack",
  "pricing_enabled": "true",
  "currency": "NGN",
  "paystack_enabled": "true",
  "paystack_mode": "test",
  "paystack_public_key": "pk_test_xxx",
  "paystack_secret_key": "sk_test_xxx",
  "paystack_callback_url": "https://example.com/booking/payment-callback",
  "paystack_channels": "card,bank,ussd,bank_transfer"
}
```

Paystack payment flow:

```http
POST /api/booking/payments/paystack/initialize
POST /api/booking/payments/paystack/verify
```

Initialize payload:

```json
{
  "bookingId": 12,
  "email": "client@example.com"
}
```

Initialize response:

```json
{
  "payment": {
    "status": "pending",
    "reference": "bkt-12-abcd1234",
    "authorizationUrl": "https://checkout.paystack.com/...",
    "accessCode": "..."
  }
}
```

Verify payload:

```json
{
  "reference": "bkt-12-abcd1234"
}
```

Successful verification marks the booking `payment_status` as `paid`, stores `paid_at`, and confirms pending/open bookings.

Calendar view:

```http
GET /calendar-view?view=weekly&date=2026-06-09&calendarId=1
```

Public booking links:

```text
/booking?calendar={calendarSlug}
/booking?event={eventTypeSlug}
```

`calendar` shows all active event types under that host calendar. `event` preselects one booking type.

Public API:

```http
GET /api/booking/calendars/{slug}
GET /api/booking/event-types?calendar={calendarSlug}
GET /api/booking/event-types/{eventTypeSlug}/availability
```

Activity:

```http
GET /activity?perPage=20
```

## Security

- Admin bearer-token authentication.
- Role-based middleware:
  - `admin`: all actions, including settings and calendar deletion.
  - `manager`: calendar and availability management.
  - `staff`: booking create/edit/status/reschedule/cancel.
  - `viewer`: read-only dashboard, calendars, bookings, availability, settings, calendar view, and activity.
- Rate limiting on auth and booking CMS routes.
- Server-side validation on every write endpoint.
- Audit logs for admin mutations.
- Conflict checks prevent double booking and booking during blackouts/breaks/outside working hours.

## Notes For Frontend CMS

Suggested booking section tabs:

- Dashboard -> `GET /dashboard/overview`
- Calendars -> `/calendars`
- Bookings -> `/bookings`
- Availability -> `/availability`
- Settings -> `/settings`

For drag-and-drop allocation, call `PUT /bookings/{id}` with a new `calendarId`, `resourceId`, `startsAt`, and `durationMinutes`, or call `POST /bookings/{id}/reschedule` for time-only changes.
