<?php

use App\Http\Controllers\Api\BakhtechApiController;
use App\Http\Controllers\Api\BookingCmsController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PricingController;
use App\Http\Middleware\RequireAdminToken;
use Illuminate\Support\Facades\Route;

Route::get('/health', [BakhtechApiController::class, 'health']);
Route::post('/auth/login', [BakhtechApiController::class, 'login'])->middleware('throttle:5,1');
Route::post('/admin/login', [BakhtechApiController::class, 'login'])->middleware('throttle:5,1');
Route::post('/admin/password/forgot', [BakhtechApiController::class, 'requestAdminPasswordReset'])->middleware('throttle:3,1');
Route::post('/admin/password/reset', [BakhtechApiController::class, 'resetAdminPassword'])->middleware('throttle:5,1');
Route::get('/admin/reviews/google/callback', [BakhtechApiController::class, 'googleReviewCallback'])->middleware('throttle:20,1');
Route::get('/projects', [BakhtechApiController::class, 'publicProjects']);
Route::get('/settings', [BakhtechApiController::class, 'publicSettings']);
Route::get('/pages/{slug}', [BakhtechApiController::class, 'publicPage']);
Route::get('/reviews', [BakhtechApiController::class, 'publicReviews']);
Route::get('/pricing', [PricingController::class, 'publicIndex']);
Route::post('/pricing/checkout', [PricingController::class, 'createDocumentFromPlan'])->middleware('throttle:20,1');
Route::get('/booking/event-types', [BakhtechApiController::class, 'bookingEventTypes']);
Route::get('/booking/calendars', [BakhtechApiController::class, 'bookingCalendars']);
Route::get('/booking/calendars/{slug}', [BakhtechApiController::class, 'bookingCalendar']);
Route::get('/booking/event-types/{slug}/availability', [BakhtechApiController::class, 'bookingAvailability']);
Route::post('/booking/bookings', [BakhtechApiController::class, 'bookPublicAppointment'])->middleware('throttle:10,1');
Route::post('/booking/payments/paystack/initialize', [BookingCmsController::class, 'initializePaystackPayment'])->middleware('throttle:20,1');
Route::post('/booking/payments/paystack/verify', [BookingCmsController::class, 'verifyPaystackPayment'])->middleware('throttle:30,1');
Route::get('/booking/google/callback', [BookingCmsController::class, 'googleCallback'])->middleware('throttle:20,1');
Route::post('/visits', [BakhtechApiController::class, 'trackVisit'])->middleware('throttle:60,1');
Route::get('/invoices/email/open/{token}', [InvoiceController::class, 'trackEmailOpen'])->middleware('throttle:240,1');
Route::get('/invoices/{token}', [InvoiceController::class, 'publicDocument'])->middleware('throttle:120,1');
Route::post('/invoices/{token}/events', [InvoiceController::class, 'trackPublicEvent'])->middleware('throttle:120,1');
Route::post('/invoices/{token}/quote-decision', [InvoiceController::class, 'decideQuote'])->middleware('throttle:20,1');
Route::post('/invoices/{token}/generate-invoice', [InvoiceController::class, 'generateInvoiceFromQuote'])->middleware('throttle:20,1');
Route::post('/invoices/{token}/payments/initialize', [InvoiceController::class, 'initializePublicPayment'])->middleware('throttle:10,1');
Route::get('/invoices/{token}/pdf', [InvoiceController::class, 'printablePdf'])->middleware('throttle:30,1');
Route::post('/invoices/payments/{gateway}/webhook', [InvoiceController::class, 'webhook'])->middleware('throttle:120,1');

Route::middleware(RequireAdminToken::class)->group(function () {
    Route::get('/auth/me', [BakhtechApiController::class, 'me']);
    Route::post('/auth/logout', fn () => response()->noContent());

    Route::get('/admin/me', [BakhtechApiController::class, 'me']);
    Route::get('/admin/dashboard', [BakhtechApiController::class, 'dashboard']);
    Route::get('/admin/projects', [BakhtechApiController::class, 'adminProjects']);
    Route::get('/admin/cms', [BakhtechApiController::class, 'cms']);
    Route::post('/admin/profile-users/{id}/save', [BakhtechApiController::class, 'updateAdminUser'])->middleware('admin.role:admin');
    Route::post('/admin/profile-users/{id}/password', [BakhtechApiController::class, 'updateAdminUserPassword'])->middleware('admin.role:admin');
    Route::post('/admin/profile-users/{id}/delete', [BakhtechApiController::class, 'deleteAdminUser'])->middleware('admin.role:admin');
    Route::post('/admin/users/{id}', [BakhtechApiController::class, 'updateAdminUser'])->middleware('admin.role:admin');
    Route::put('/admin/users/{id}', [BakhtechApiController::class, 'updateAdminUser'])->middleware('admin.role:admin');
    Route::post('/admin/users/{id}/password', [BakhtechApiController::class, 'updateAdminUserPassword'])->middleware('admin.role:admin');
    Route::put('/admin/users/{id}/password', [BakhtechApiController::class, 'updateAdminUserPassword'])->middleware('admin.role:admin');
    Route::post('/admin/users/{id}/two-factor/setup', [BakhtechApiController::class, 'setupAdminUserTwoFactor'])->middleware('admin.role:admin');
    Route::post('/admin/users/{id}/two-factor', [BakhtechApiController::class, 'enableAdminUserTwoFactor'])->middleware('admin.role:admin');
    Route::put('/admin/users/{id}/two-factor', [BakhtechApiController::class, 'enableAdminUserTwoFactor'])->middleware('admin.role:admin');
    Route::post('/admin/users/{id}/two-factor/disable', [BakhtechApiController::class, 'disableAdminUserTwoFactor'])->middleware('admin.role:admin');
    Route::delete('/admin/users/{id}/two-factor', [BakhtechApiController::class, 'disableAdminUserTwoFactor'])->middleware('admin.role:admin');
    Route::post('/admin/pages', [BakhtechApiController::class, 'createPage']);
    Route::put('/admin/pages/{id}', [BakhtechApiController::class, 'updatePage']);
    Route::delete('/admin/pages/{id}', [BakhtechApiController::class, 'deletePage']);
    Route::post('/admin/posts', [BakhtechApiController::class, 'createPost']);
    Route::put('/admin/posts/{id}', [BakhtechApiController::class, 'updatePost']);
    Route::delete('/admin/posts/{id}', [BakhtechApiController::class, 'deletePost']);
    Route::post('/admin/reviews', [BakhtechApiController::class, 'createReview']);
    Route::put('/admin/reviews/{id}', [BakhtechApiController::class, 'updateReview']);
    Route::delete('/admin/reviews/{id}', [BakhtechApiController::class, 'deleteReview']);
    Route::get('/admin/reviews/google/oauth-url', [BakhtechApiController::class, 'googleReviewOauthUrl'])->middleware('admin.role:admin');
    Route::get('/admin/reviews/google/locations', [BakhtechApiController::class, 'googleReviewLocations'])->middleware('admin.role:admin');
    Route::post('/admin/reviews/google/location', [BakhtechApiController::class, 'selectGoogleReviewLocation'])->middleware('admin.role:admin');
    Route::put('/admin/reviews/google/location', [BakhtechApiController::class, 'selectGoogleReviewLocation'])->middleware('admin.role:admin');
    Route::post('/admin/reviews/google/import', [BakhtechApiController::class, 'importGoogleReviews'])->middleware('admin.role:admin');
    Route::post('/admin/bookings', [BakhtechApiController::class, 'createBooking']);
    Route::put('/admin/bookings/{id}', [BakhtechApiController::class, 'updateBooking']);
    Route::put('/admin/settings', [BakhtechApiController::class, 'updateSettings']);
    Route::get('/admin/media', [BakhtechApiController::class, 'media']);
    Route::post('/admin/media', [BakhtechApiController::class, 'uploadMedia']);
    Route::delete('/admin/media/{id}', [BakhtechApiController::class, 'deleteMedia']);
    Route::post('/admin/projects', [BakhtechApiController::class, 'createProject']);
    Route::put('/admin/projects/{id}', [BakhtechApiController::class, 'updateProject']);
    Route::delete('/admin/projects/{id}', [BakhtechApiController::class, 'deleteProject']);

    Route::prefix('/admin/pricing')->middleware('throttle:60,1')->group(function () {
        Route::get('/', [PricingController::class, 'adminIndex']);
        Route::post('/categories', [PricingController::class, 'storeCategory'])->middleware('admin.role:manager');
        Route::put('/categories/{id}', [PricingController::class, 'updateCategory'])->middleware('admin.role:manager');
        Route::delete('/categories/{id}', [PricingController::class, 'destroyCategory'])->middleware('admin.role:admin');
        Route::post('/features', [PricingController::class, 'storeFeature'])->middleware('admin.role:manager');
        Route::put('/features/{id}', [PricingController::class, 'updateFeature'])->middleware('admin.role:manager');
        Route::delete('/features/{id}', [PricingController::class, 'destroyFeature'])->middleware('admin.role:admin');
        Route::post('/plans', [PricingController::class, 'storePlan'])->middleware('admin.role:manager');
        Route::put('/plans/{id}', [PricingController::class, 'updatePlan'])->middleware('admin.role:manager');
        Route::delete('/plans/{id}', [PricingController::class, 'destroyPlan'])->middleware('admin.role:admin');
    });

    Route::prefix('/admin/invoices')->middleware('throttle:60,1')->group(function () {
        Route::get('/overview', [InvoiceController::class, 'overview']);
        Route::get('/clients', [InvoiceController::class, 'clients']);
        Route::get('/documents', [InvoiceController::class, 'documents']);
        Route::get('/email-logs', [InvoiceController::class, 'emailLogs']);
        Route::get('/email-logs/{id}', [InvoiceController::class, 'emailLog']);
        Route::delete('/email-logs', [InvoiceController::class, 'clearEmailLogs'])->middleware('admin.role:admin');
        Route::post('/documents', [InvoiceController::class, 'createDocument']);
        Route::get('/documents/{id}', [InvoiceController::class, 'document']);
        Route::put('/documents/{id}', [InvoiceController::class, 'updateDocument']);
        Route::post('/documents/{id}/send', [InvoiceController::class, 'sendDocument']);
        Route::post('/documents/{id}/payments', [InvoiceController::class, 'recordPayment']);
        Route::post('/documents/{id}/send-receipt', [InvoiceController::class, 'sendReceipt']);
        Route::post('/documents/{id}/payments/initialize', [InvoiceController::class, 'initializePayment']);
        Route::get('/export/json', [InvoiceController::class, 'exportToJSON']);
        Route::post('/import/json', [InvoiceController::class, 'importFromJSON']);
    });

    Route::prefix('/admin/booking')->middleware('throttle:60,1')->group(function () {
        Route::get('/dashboard/overview', [BookingCmsController::class, 'overview']);
        Route::get('/calendar-view', [BookingCmsController::class, 'calendarView']);
        Route::get('/activity', [BookingCmsController::class, 'activity']);

        Route::get('/calendars', [BookingCmsController::class, 'calendars']);
        Route::get('/calendars/{id}', [BookingCmsController::class, 'calendar']);
        Route::post('/calendars', [BookingCmsController::class, 'createCalendar'])->middleware('admin.role:manager');
        Route::put('/calendars/{id}', [BookingCmsController::class, 'updateCalendar'])->middleware('admin.role:manager');
        Route::delete('/calendars/{id}', [BookingCmsController::class, 'deleteCalendar'])->middleware('admin.role:admin');

        Route::get('/event-types', [BookingCmsController::class, 'eventTypes']);
        Route::post('/event-types', [BookingCmsController::class, 'createEventType'])->middleware('admin.role:manager');
        Route::put('/event-types/{id}', [BookingCmsController::class, 'updateEventType'])->middleware('admin.role:manager');

        Route::get('/bookings', [BookingCmsController::class, 'bookings']);
        Route::get('/bookings/{id}', [BookingCmsController::class, 'booking']);
        Route::post('/bookings', [BookingCmsController::class, 'createBooking'])->middleware('admin.role:staff');
        Route::put('/bookings/{id}', [BookingCmsController::class, 'updateBooking'])->middleware('admin.role:staff');
        Route::put('/bookings/{id}/status', [BookingCmsController::class, 'updateBookingStatus'])->middleware('admin.role:staff');
        Route::post('/bookings/{id}/reschedule', [BookingCmsController::class, 'rescheduleBooking'])->middleware('admin.role:staff');
        Route::post('/bookings/{id}/cancel', [BookingCmsController::class, 'cancelBooking'])->middleware('admin.role:staff');

        Route::get('/availability', [BookingCmsController::class, 'availability']);
        Route::post('/availability', [BookingCmsController::class, 'saveAvailability'])->middleware('admin.role:manager');
        Route::post('/availability/blackouts', [BookingCmsController::class, 'createBlackout'])->middleware('admin.role:manager');
        Route::post('/availability/check', [BookingCmsController::class, 'checkAvailability']);

        Route::get('/settings', [BookingCmsController::class, 'settings']);
        Route::put('/settings', [BookingCmsController::class, 'updateSettings'])->middleware('admin.role:admin');
        Route::get('/google/oauth-url', [BookingCmsController::class, 'googleOauthUrl'])->middleware('admin.role:admin');
        Route::get('/google/calendars', [BookingCmsController::class, 'googleCalendars'])->middleware('admin.role:admin');
        Route::put('/google/calendar', [BookingCmsController::class, 'selectGoogleCalendar'])->middleware('admin.role:admin');
    });
});
