<?php

use App\Http\Controllers\Api\BakhtechApiController;
use App\Http\Controllers\Api\BookingCmsController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\MailSettingsController;
use App\Http\Controllers\Api\PricingController;
use App\Http\Controllers\Api\RedisSettingsController;
use App\Http\Controllers\Api\SystemMaintenanceController;
use App\Http\Middleware\RequireAdminToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;

Route::get('/health', [BakhtechApiController::class, 'health']);
Route::get('/sitemap.xml', function () {
    $baseUrl = rtrim((string) config('app.url', 'https://bakhtech.com.ng'), '/');
    $paths = collect(['/', '/about', '/portfolio', '/pricing', '/booking', '/contact']);

    if (Schema::hasTable('pages')) {
        $cmsPaths = DB::table('pages')
            ->where('status', 'published')
            ->where('meta_robots', 'not like', '%noindex%')
            ->pluck('slug')
            ->map(fn ($slug) => $slug === 'home' ? '/' : '/'.trim((string) $slug, '/'));

        $paths = $paths->merge($cmsPaths);
    }

    $paths = $paths->merge(['/llms.txt', '/markdown-mirrors.txt']);

    $urls = $paths
        ->filter()
        ->unique()
        ->map(fn ($path) => '<url><loc>'.e($baseUrl.($path === '/' ? '' : $path)).'</loc><changefreq>weekly</changefreq><priority>'.($path === '/' ? '1.0' : '0.8').'</priority></url>')
        ->implode('');

    return response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.$urls.'</urlset>', 200, [
        'Content-Type' => 'application/xml; charset=UTF-8',
    ]);
});
Route::post('/auth/login', [BakhtechApiController::class, 'login'])->middleware('throttle:5,1');
Route::post('/admin/login', [BakhtechApiController::class, 'login'])->middleware('throttle:5,1');
Route::post('/admin/password/forgot', [BakhtechApiController::class, 'requestAdminPasswordReset'])->middleware('throttle:3,1');
Route::post('/admin/password/reset', [BakhtechApiController::class, 'resetAdminPassword'])->middleware('throttle:5,1');
Route::post('/reviews/google/trustindex-webhook', [BakhtechApiController::class, 'googleReviewWebhook'])->middleware('throttle:20,1');
Route::post('/reviews/trustpilot/trustindex-webhook', [BakhtechApiController::class, 'trustpilotReviewWebhook'])->middleware('throttle:20,1');
Route::get('/projects', [BakhtechApiController::class, 'publicProjects']);
Route::get('/settings', [BakhtechApiController::class, 'publicSettings']);
Route::post('/contact', [BakhtechApiController::class, 'submitContact'])->middleware('throttle:3,1');
Route::get('/pages/{slug}', [BakhtechApiController::class, 'publicPage']);
Route::get('/uploads/{filename}', [BakhtechApiController::class, 'uploadedMedia'])->where('filename', '[^/]+');
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
Route::post('/invoices/{token}/payments/initialize', [InvoiceController::class, 'initializePublicPayment'])->middleware('throttle:invoice-payment');
Route::post('/invoices/{token}/payments/verify', [InvoiceController::class, 'verifyPublicPayment'])->middleware('throttle:30,1');
Route::get('/invoices/{token}/pdf', [InvoiceController::class, 'printablePdf'])->middleware('throttle:30,1');
Route::get('/invoices/{token}/receipt', [InvoiceController::class, 'publicReceipt'])->middleware('throttle:60,1');
Route::get('/invoices/{token}/receipt/pdf', [InvoiceController::class, 'receiptPdf'])->middleware('throttle:30,1');
Route::post('/invoices/payments/{gateway}/webhook', [InvoiceController::class, 'webhook'])->middleware('throttle:120,1');

Route::middleware(RequireAdminToken::class)->group(function () {
    Route::get('/auth/me', [BakhtechApiController::class, 'me']);
    Route::post('/auth/logout', [BakhtechApiController::class, 'logout']);

    Route::get('/admin/me', [BakhtechApiController::class, 'me']);
    Route::get('/admin/sessions', [BakhtechApiController::class, 'adminSessions']);
    Route::post('/admin/sessions/logout-all', [BakhtechApiController::class, 'logoutAllAdminSessions']);
    Route::delete('/admin/sessions/{id}', [BakhtechApiController::class, 'revokeAdminSession'])->whereNumber('id');
    Route::get('/admin/dashboard', [BakhtechApiController::class, 'dashboard']);
    Route::get('/admin/analytics', [BakhtechApiController::class, 'visitorAnalytics']);
    Route::get('/admin/seo/audit', [BakhtechApiController::class, 'seoAudit']);
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
    Route::get('/admin/posts', [BakhtechApiController::class, 'adminPosts']);
    Route::post('/admin/posts', [BakhtechApiController::class, 'createPost']);
    Route::put('/admin/posts/{id}', [BakhtechApiController::class, 'updatePost']);
    Route::delete('/admin/posts/{id}', [BakhtechApiController::class, 'deletePost']);
    Route::post('/admin/reviews', [BakhtechApiController::class, 'createReview']);
    Route::put('/admin/reviews/{id}', [BakhtechApiController::class, 'updateReview']);
    Route::delete('/admin/reviews/{id}', [BakhtechApiController::class, 'deleteReview']);
    Route::get('/admin/reviews/google/connection', [BakhtechApiController::class, 'googleReviewConnection'])->middleware('admin.role:admin');
    Route::post('/admin/reviews/google/import', [BakhtechApiController::class, 'importGoogleReviews'])->middleware('admin.role:admin');
    Route::post('/admin/reviews/google/disconnect', [BakhtechApiController::class, 'disconnectGoogleReviews'])->middleware('admin.role:admin');
    Route::get('/admin/reviews/trustpilot/connection', [BakhtechApiController::class, 'trustpilotReviewConnection'])->middleware('admin.role:admin');
    Route::post('/admin/reviews/trustpilot/import', [BakhtechApiController::class, 'importTrustpilotReviews'])->middleware('admin.role:admin');
    Route::post('/admin/reviews/trustpilot/disconnect', [BakhtechApiController::class, 'disconnectTrustpilotReviews'])->middleware('admin.role:admin');
    Route::post('/admin/bookings', [BakhtechApiController::class, 'createBooking']);
    Route::put('/admin/bookings/{id}', [BakhtechApiController::class, 'updateBooking']);
    Route::put('/admin/settings', [BakhtechApiController::class, 'updateSettings']);
    Route::get('/admin/mail/settings', [MailSettingsController::class, 'show'])->middleware('admin.role:admin');
    Route::post('/admin/mail/settings', [MailSettingsController::class, 'update'])->middleware('admin.role:admin');
    Route::put('/admin/mail/settings', [MailSettingsController::class, 'update'])->middleware('admin.role:admin');
    Route::post('/admin/mail/test', [MailSettingsController::class, 'test'])->middleware(['admin.role:admin', 'throttle:5,1']);
    Route::get('/admin/mail/logs', [MailSettingsController::class, 'logs'])->middleware('admin.role:admin');
    Route::get('/admin/mail/logs/{id}', [MailSettingsController::class, 'log'])->whereNumber('id')->middleware('admin.role:admin');
    Route::post('/admin/mail/logs/clear', [MailSettingsController::class, 'clear'])->middleware('admin.role:admin');
    Route::delete('/admin/mail/logs', [MailSettingsController::class, 'clear'])->middleware('admin.role:admin');
    Route::get('/admin/redis/settings', [RedisSettingsController::class, 'show'])->middleware('admin.role:admin');
    Route::post('/admin/redis/settings', [RedisSettingsController::class, 'update'])->middleware('admin.role:admin');
    Route::put('/admin/redis/settings', [RedisSettingsController::class, 'update'])->middleware('admin.role:admin');
    Route::post('/admin/redis/test', [RedisSettingsController::class, 'test'])->middleware(['admin.role:admin', 'throttle:10,1']);
    Route::post('/admin/system/deploy', [SystemMaintenanceController::class, 'deploy'])->middleware('admin.role:admin');
    Route::get('/admin/media', [BakhtechApiController::class, 'media']);
    Route::post('/admin/media', [BakhtechApiController::class, 'uploadMedia']);
    Route::post('/admin/media/base64', [BakhtechApiController::class, 'uploadMediaBase64']);
    Route::post('/admin/media/delete', [BakhtechApiController::class, 'deleteMediaFile']);
    Route::delete('/admin/media/{id}', [BakhtechApiController::class, 'deleteMedia']);
    Route::post('/admin/projects', [BakhtechApiController::class, 'createProject']);
    Route::post('/admin/projects/{id}/media', [BakhtechApiController::class, 'updateProjectMedia']);
    Route::post('/admin/projects/{id}/save', [BakhtechApiController::class, 'updateProject']);
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
        Route::post('/bookings/bulk-delete', [BookingCmsController::class, 'deleteBookings'])->middleware('admin.role:admin');
        Route::delete('/bookings/{id}', [BookingCmsController::class, 'deleteBooking'])->middleware('admin.role:admin');
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
