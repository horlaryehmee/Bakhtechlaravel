<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GoogleBusinessReviewsService;
use App\Services\GoogleCalendarService;
use App\Services\DeploymentMaintenanceService;
use App\Services\BookingNotificationService;
use App\Services\ZoomMeetingService;
use App\Support\AdminToken;
use App\Support\SiteDefaults;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class BakhtechApiController extends Controller
{
    public function health()
    {
        try {
            DB::connection()->getPdo();
            DB::table('migrations')->limit(1)->exists();
        } catch (\Throwable) {
            return response()->json([
                'ok' => false,
                'service' => 'bakhtech-api',
                'database' => 'disconnected',
            ], 503);
        }

        return [
            'ok' => true,
            'service' => 'bakhtech-api',
            'database' => 'connected',
        ];
    }

    public function login(Request $request)
    {
        $email = strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');
        $admin = DB::table('admins')->where('email', $email)->first();

        if (! $admin || ! Hash::check($password, $admin->password_hash)) {
            return response()->json(['message' => 'Invalid email or password.'], 401);
        }

        if (($admin->two_factor_enabled ?? false) && ! $this->validTotpCode($admin, (string) $request->input('twoFactorCode', ''))) {
            return response()->json([
                'message' => 'Enter a valid two-factor authentication code.',
                'requiresTwoFactor' => true,
            ], 422);
        }

        return [
            'token' => AdminToken::make($admin),
            'admin' => $this->adminShape($admin),
        ];
    }

    public function requestAdminPasswordReset(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
        ]);
        $email = strtolower(trim($data['email']));
        $admin = DB::table('admins')->where('email', $email)->first();

        DB::table('admin_password_resets')->where('created_at', '<', now()->subDay())->delete();

        if ($admin) {
            $token = Str::random(72);
            $resetUrl = rtrim(config('app.url'), '/').'/admin/reset-password?email='.rawurlencode($email).'&token='.rawurlencode($token);

            DB::table('admin_password_resets')->where('email', $email)->delete();
            DB::table('admin_password_resets')->insert([
                'email' => $email,
                'token_hash' => hash('sha256', $token),
                'expires_at' => now()->addHour(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Mail::raw(
                "A password reset was requested for your Bakhtech admin account.\n\nReset your password here:\n{$resetUrl}\n\nThis link expires in 60 minutes. If you did not request this, ignore this email.",
                function ($message) use ($email) {
                    $message->to($email)->subject('Reset your Bakhtech admin password');
                }
            );
        }

        return ['message' => 'If that admin email exists, a password reset link has been sent.'];
    }

    public function resetAdminPassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);
        $email = strtolower(trim($data['email']));
        $tokenHash = hash('sha256', (string) $data['token']);
        $reset = DB::table('admin_password_resets')
            ->where('email', $email)
            ->where('token_hash', $tokenHash)
            ->where('expires_at', '>', now())
            ->first();

        if (! $reset) {
            return response()->json(['message' => 'This password reset link is invalid or expired.'], 422);
        }

        $updated = DB::table('admins')->where('email', $email)->update([
            'password_hash' => Hash::make($data['password']),
            'updated_at' => now(),
        ]);

        DB::table('admin_password_resets')->where('email', $email)->delete();

        if (! $updated) {
            return response()->json(['message' => 'This password reset link is invalid or expired.'], 422);
        }

        return ['message' => 'Password reset successfully. You can now sign in.'];
    }

    public function me(Request $request)
    {
        return ['admin' => $this->adminShape($request->attributes->get('admin'))];
    }

    public function dashboard()
    {
        $today = now()->toDateString();

        return [
            'totals' => [
                'projects' => DB::table('projects')->count(),
                'publishedProjects' => DB::table('projects')->where('status', 'published')->count(),
                'bookings' => DB::table('bookings')->count(),
                'upcomingBookings' => Schema::hasColumn('bookings', 'starts_at')
                    ? DB::table('bookings')->where('starts_at', '>=', now())->whereNotIn('status', ['cancelled', 'closed'])->count()
                    : 0,
                'visits' => DB::table('visits')->count(),
                'todayVisits' => DB::table('visits')->whereDate('created_at', $today)->count(),
            ],
            'seo' => ['score' => 92, 'indexedPages' => 18, 'issues' => 3],
            'performance' => ['score' => 88, 'loadTime' => '1.8s', 'mobileScore' => 84],
            'visits' => [
                'topPages' => DB::table('visits')
                    ->select('path', DB::raw('COUNT(*) as visits'))
                    ->groupBy('path')
                    ->orderByDesc('visits')
                    ->limit(6)
                    ->get(),
            ],
        ];
    }

    public function adminProjects()
    {
        return ['projects' => $this->projectQuery(true)->map(fn ($row) => $this->projectShape($row))];
    }

    public function publicProjects()
    {
        return ['projects' => $this->projectQuery(false)->map(fn ($row) => $this->projectShape($row))];
    }

    public function publicSettings()
    {
        $settings = $this->settings();
        $publicKeys = [
            'siteName',
            'contactEmail',
            'phone',
            'activeHome',
            'homePortfolioShowDescriptions',
            'homepageVideoUrl',
            'theme_light_primary',
            'theme_light_secondary',
            'theme_light_active',
            'theme_dark_primary',
            'theme_dark_secondary',
            'theme_dark_active',
            'navigation_items',
            'googleReviewUrl',
            'trustpilotReviewUrl',
            'facebookUrl',
            'instagramUrl',
            'linkedinUrl',
            'tiktokUrl',
            'twitterUrl',
            'youtubeUrl',
            'bookingIntro',
            'company_name',
            'company_logo',
            'company_email',
            'company_phone',
            'company_address',
            'company_website',
        ];

        return ['settings' => array_intersect_key($settings, array_flip($publicKeys))];
    }

    public function publicPage(string $slug)
    {
        $page = DB::table('pages')
            ->where('slug', Str::slug($slug))
            ->where('status', 'published')
            ->first();

        if (! $page) {
            return response()->json(['message' => 'Page not found.'], 404);
        }

        return ['page' => $this->pageShape($page)];
    }

    public function publicReviews()
    {
        if (! Schema::hasTable('reviews')) {
            return ['reviews' => []];
        }

        $settings = $this->settings();
        $minWords = max(0, (int) ($settings['reviewFrontendMinWords'] ?? 0));
        $maxWords = max(0, (int) ($settings['reviewFrontendMaxWords'] ?? 0));
        $minCharacters = max(0, (int) ($settings['reviewFrontendMinCharacters'] ?? 0));
        $maxCharacters = max(0, (int) ($settings['reviewFrontendMaxCharacters'] ?? 0));
        $minRating = min(5, max(1, (int) ($settings['reviewFrontendMinRating'] ?? 1)));
        $provider = trim((string) ($settings['reviewFrontendProvider'] ?? 'all'));
        $featuredOnly = filter_var($settings['reviewFrontendFeaturedOnly'] ?? false, FILTER_VALIDATE_BOOL);
        $limit = min(50, max(1, (int) ($settings['reviewFrontendLimit'] ?? 6)));

        $reviews = $this->reviewQuery(false)
            ->get()
            ->filter(function ($row) use ($minWords, $maxWords, $minCharacters, $maxCharacters, $minRating, $provider, $featuredOnly) {
                $content = trim(strip_tags((string) $row->content));
                $wordCount = str_word_count($content);
                $characterCount = mb_strlen($content);

                return (int) $row->rating >= $minRating
                    && ($provider === '' || $provider === 'all' || $row->provider === $provider)
                    && (! $featuredOnly || (bool) $row->is_featured)
                    && $wordCount >= $minWords
                    && ($maxWords === 0 || $wordCount <= $maxWords)
                    && $characterCount >= $minCharacters
                    && ($maxCharacters === 0 || $characterCount <= $maxCharacters);
            })
            ->take($limit)
            ->map(fn ($row) => $this->reviewShape($row))
            ->values();

        return ['reviews' => $reviews];
    }

    public function cms()
    {
        return [
            'pages' => DB::table('pages')->orderBy('id')->get()->map(fn ($row) => $this->pageShape($row)),
            'posts' => DB::table('posts')->orderByDesc('updated_at')->get()->map(fn ($row) => $this->postShape($row)),
            'bookings' => DB::table('bookings')->orderByDesc('created_at')->get()->map(fn ($row) => $this->bookingShape($row)),
            'bookingEventTypes' => Schema::hasTable('booking_event_types') ? DB::table('booking_event_types')->orderBy('name')->get()->map(fn ($row) => $this->bookingEventTypeShape($row, true)) : collect(),
            'reviews' => Schema::hasTable('reviews') ? $this->reviewQuery(true)->get()->map(fn ($row) => $this->reviewShape($row)) : collect(),
            'users' => DB::table('admins')->orderBy('id')->get()->map(fn ($row) => $this->adminUserShape($row)),
            'settings' => $this->settings(),
            'media' => $this->mediaList(),
        ];
    }

    public function updateAdminUserPassword(Request $request, int $id)
    {
        $data = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $admin = DB::table('admins')->where('id', $id)->first();
        if (! $admin) {
            return response()->json(['message' => 'Admin user not found.'], 404);
        }

        DB::table('admins')->where('id', $id)->update([
            'password_hash' => Hash::make($data['password']),
            'updated_at' => now(),
        ]);

        return ['user' => $this->adminUserShape(DB::table('admins')->where('id', $id)->first())];
    }

    public function updateAdminUser(Request $request, int $id)
    {
        $admin = DB::table('admins')->where('id', $id)->first();
        if (! $admin) {
            return response()->json(['message' => 'Admin user not found.'], 404);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
        ]);

        $email = strtolower(trim($data['email']));
        $duplicate = DB::table('admins')->where('email', $email)->where('id', '!=', $id)->exists();
        if ($duplicate) {
            return response()->json(['message' => 'That email is already used by another admin user.'], 422);
        }

        DB::table('admins')->where('id', $id)->update([
            'name' => trim($data['name']),
            'email' => $email,
            'updated_at' => now(),
        ]);

        return ['user' => $this->adminUserShape(DB::table('admins')->where('id', $id)->first())];
    }

    public function deleteAdminUser(Request $request, int $id)
    {
        $admin = DB::table('admins')->where('id', $id)->first();
        if (! $admin) {
            return response()->json(['message' => 'Admin user not found.'], 404);
        }

        if ((int) $request->attributes->get('admin')?->id === $id) {
            return response()->json(['message' => 'You cannot delete the admin account you are currently using.'], 422);
        }

        if (DB::table('admins')->count() <= 1) {
            return response()->json(['message' => 'You cannot delete the last admin user.'], 422);
        }

        DB::table('admins')->where('id', $id)->delete();

        return response()->noContent();
    }

    public function setupAdminUserTwoFactor(int $id)
    {
        $admin = DB::table('admins')->where('id', $id)->first();
        if (! $admin) {
            return response()->json(['message' => 'Admin user not found.'], 404);
        }

        $secret = $this->generateTotpSecret();
        DB::table('admins')->where('id', $id)->update([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_enabled' => false,
            'updated_at' => now(),
        ]);

        return [
            'secret' => $secret,
            'otpauthUri' => $this->totpUri($admin->email, $secret),
            'user' => $this->adminUserShape(DB::table('admins')->where('id', $id)->first()),
        ];
    }

    public function enableAdminUserTwoFactor(Request $request, int $id)
    {
        $admin = DB::table('admins')->where('id', $id)->first();
        if (! $admin) {
            return response()->json(['message' => 'Admin user not found.'], 404);
        }

        if (! $admin->two_factor_secret) {
            return response()->json(['message' => 'Start two-factor setup before enabling it.'], 422);
        }

        if (! $this->validTotpCode($admin, (string) $request->input('code', ''))) {
            return response()->json(['message' => 'Enter a valid two-factor authentication code.'], 422);
        }

        DB::table('admins')->where('id', $id)->update([
            'two_factor_enabled' => true,
            'updated_at' => now(),
        ]);

        return ['user' => $this->adminUserShape(DB::table('admins')->where('id', $id)->first())];
    }

    public function disableAdminUserTwoFactor(int $id)
    {
        $admin = DB::table('admins')->where('id', $id)->first();
        if (! $admin) {
            return response()->json(['message' => 'Admin user not found.'], 404);
        }

        DB::table('admins')->where('id', $id)->update([
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
            'updated_at' => now(),
        ]);

        return ['user' => $this->adminUserShape(DB::table('admins')->where('id', $id)->first())];
    }

    public function createPage(Request $request)
    {
        $existing = (object) [
            'id' => 0,
            'title' => '',
            'slug' => '',
            'template' => 'default',
            'parent_id' => null,
            'sort_order' => 0,
            'content' => '',
            'excerpt' => '',
            'seo_title' => '',
            'seo_description' => '',
            'canonical_url' => '',
            'meta_robots' => 'index,follow',
            'focus_keyword' => '',
            'og_title' => '',
            'og_description' => '',
            'og_image' => '',
            'twitter_title' => '',
            'twitter_description' => '',
            'twitter_image' => '',
            'schema_type' => 'WebPage',
            'schema_json' => '',
            'status' => 'draft',
            'published_at' => null,
        ];
        $payload = $this->pagePayload($request, $existing);

        if ($payload['title'] === '') {
            return response()->json(['message' => 'Page title is required.'], 400);
        }

        $payload['created_at'] = now();
        $payload['updated_at'] = now();

        $id = DB::table('pages')->insertGetId($payload);

        return response()->json(['page' => $this->pageShape(DB::table('pages')->where('id', $id)->first())], 201);
    }

    public function updatePage(Request $request, int $id)
    {
        $existing = DB::table('pages')->where('id', $id)->first();
        if (! $existing) {
            return response()->json(['message' => 'Page not found.'], 404);
        }

        $payload = $this->pagePayload($request, $existing);
        if ($payload['title'] === '') {
            return response()->json(['message' => 'Page title is required.'], 400);
        }

        $payload['updated_at'] = now();

        DB::table('pages')->where('id', $id)->update($payload);

        return ['page' => $this->pageShape(DB::table('pages')->where('id', $id)->first())];
    }

    public function deletePage(int $id)
    {
        DB::table('pages')->where('id', $id)->delete();

        return response()->noContent();
    }

    public function createPost(Request $request)
    {
        $title = trim((string) $request->input('title'));
        if ($title === '') {
            return response()->json(['message' => 'Post title is required.'], 400);
        }

        $id = DB::table('posts')->insertGetId([
            'title' => $title,
            'slug' => $this->uniqueSlug('posts', $request->input('slug', $title)),
            'excerpt' => (string) $request->input('excerpt', ''),
            'content' => (string) $request->input('content', ''),
            'category' => (string) $request->input('category', ''),
            'image' => (string) $request->input('image', ''),
            'status' => (string) $request->input('status', 'draft'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['post' => $this->postShape(DB::table('posts')->where('id', $id)->first())], 201);
    }

    public function updatePost(Request $request, int $id)
    {
        $exists = DB::table('posts')->where('id', $id)->exists();
        if (! $exists) {
            return response()->json(['message' => 'Post not found.'], 404);
        }

        $title = trim((string) $request->input('title'));
        DB::table('posts')->where('id', $id)->update([
            'title' => $title,
            'slug' => $this->uniqueSlug('posts', $request->input('slug', $title), $id),
            'excerpt' => (string) $request->input('excerpt', ''),
            'content' => (string) $request->input('content', ''),
            'category' => (string) $request->input('category', ''),
            'image' => (string) $request->input('image', ''),
            'status' => (string) $request->input('status', 'draft'),
            'updated_at' => now(),
        ]);

        return ['post' => $this->postShape(DB::table('posts')->where('id', $id)->first())];
    }

    public function deletePost(int $id)
    {
        DB::table('posts')->where('id', $id)->delete();

        return response()->noContent();
    }

    public function createReview(Request $request)
    {
        $payload = $this->reviewPayload($request);
        if ($payload['author_name'] === '' || $payload['content'] === '') {
            return response()->json(['message' => 'Reviewer name and review text are required.'], 400);
        }

        $payload['review_source_id'] = $this->reviewSourceId($payload['provider']);
        $payload['external_id'] = 'manual-'.Str::uuid();
        $payload['created_at'] = now();
        $payload['updated_at'] = now();

        $id = DB::table('reviews')->insertGetId($payload);

        return response()->json(['review' => $this->reviewShape(DB::table('reviews')->where('id', $id)->first())], 201);
    }

    public function updateReview(Request $request, int $id)
    {
        $existing = DB::table('reviews')->where('id', $id)->first();
        if (! $existing) {
            return response()->json(['message' => 'Review not found.'], 404);
        }

        $payload = $this->reviewPayload($request, $existing);
        if ($payload['author_name'] === '' || $payload['content'] === '') {
            return response()->json(['message' => 'Reviewer name and review text are required.'], 400);
        }

        $payload['review_source_id'] = $this->reviewSourceId($payload['provider']);
        $payload['updated_at'] = now();

        DB::table('reviews')->where('id', $id)->update($payload);

        return ['review' => $this->reviewShape(DB::table('reviews')->where('id', $id)->first())];
    }

    public function deleteReview(int $id)
    {
        DB::table('reviews')->where('id', $id)->delete();

        return response()->noContent();
    }

    public function googleReviewConnection(GoogleBusinessReviewsService $google)
    {
        return ['google' => $google->connection()];
    }

    public function googleReviewWebhook(Request $request, GoogleBusinessReviewsService $google)
    {
        return $google->webhook($request->all())
            ? response()->json(['ok' => true])
            : response()->json(['ok' => false], 403);
    }

    public function trustpilotReviewConnection(GoogleBusinessReviewsService $reviews)
    {
        return ['trustpilot' => $reviews->connection('trustpilot')];
    }

    public function trustpilotReviewWebhook(Request $request, GoogleBusinessReviewsService $reviews)
    {
        return $reviews->webhook($request->all(), 'trustpilot')
            ? response()->json(['ok' => true])
            : response()->json(['ok' => false], 403);
    }

    public function importGoogleReviews(Request $request, GoogleBusinessReviewsService $google)
    {
        $data = $request->validate([
            'payload' => ['required', 'array'],
        ]);
        $result = $google->importPayload($data['payload']);

        return [
            'result' => $result,
            'google' => $google->connection(),
            'reviews' => $this->reviewQuery(true)->get()->map(fn ($row) => $this->reviewShape($row)),
        ];
    }

    public function disconnectGoogleReviews(GoogleBusinessReviewsService $google)
    {
        $google->disconnect();

        return ['google' => $google->connection()];
    }

    public function importTrustpilotReviews(Request $request, GoogleBusinessReviewsService $reviews)
    {
        $data = $request->validate([
            'businessUrl' => ['required', 'string', 'max:500'],
            'apiKey' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $result = $reviews->syncTrustpilot($data['businessUrl'], $data['apiKey'] ?? '');
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return [
            'result' => $result,
            'trustpilot' => $reviews->connection('trustpilot'),
            'reviews' => $this->reviewQuery(true)->get()->map(fn ($row) => $this->reviewShape($row)),
        ];
    }

    public function disconnectTrustpilotReviews(GoogleBusinessReviewsService $reviews)
    {
        $reviews->disconnect('trustpilot');

        return ['trustpilot' => $reviews->connection('trustpilot')];
    }

    public function createBooking(Request $request)
    {
        if (Schema::hasTable('booking_event_types') && $request->filled('eventTypeId') && $request->filled('startsAt')) {
            return $this->storeBooking($request, true);
        }

        $scheduledAt = (string) $request->input('scheduledAt', '');
        $timezone = (string) $request->input('timezone', 'Africa/Lagos');
        $start = $scheduledAt !== '' ? Carbon::parse($scheduledAt, $timezone) : now($timezone);
        $end = $start->copy()->addMinutes((int) $request->input('durationMinutes', 30));
        $payload = [
            'name' => (string) $request->input('name', 'Website visitor'),
            'email' => (string) $request->input('email', ''),
            'phone' => (string) $request->input('phone', ''),
            'service' => (string) $request->input('service', ''),
            'message' => (string) $request->input('message', ''),
            'status' => (string) $request->input('status', 'open'),
            'scheduled_at' => $scheduledAt,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('bookings', 'timezone')) {
            $payload['timezone'] = $timezone;
        }
        if (Schema::hasColumn('bookings', 'attendee_timezone')) {
            $payload['attendee_timezone'] = $timezone;
        }
        if (Schema::hasColumn('bookings', 'starts_at')) {
            $payload['starts_at'] = $start->toDateTimeString();
        }
        if (Schema::hasColumn('bookings', 'ends_at')) {
            $payload['ends_at'] = $end->toDateTimeString();
        }
        if (Schema::hasColumn('bookings', 'duration_minutes')) {
            $payload['duration_minutes'] = (int) $request->input('durationMinutes', 30);
        }
        if (Schema::hasColumn('bookings', 'location_type')) {
            $payload['location_type'] = (string) $request->input('locationType', 'phone');
        }
        if (Schema::hasColumn('bookings', 'location_value')) {
            $payload['location_value'] = (string) $request->input('locationValue', $request->input('phone', ''));
        }
        if (Schema::hasColumn('bookings', 'cancel_token')) {
            $payload['cancel_token'] = (string) Str::uuid();
        }

        $id = DB::table('bookings')->insertGetId($payload);
        app(BookingNotificationService::class)->bookingCreated($id);

        return response()->json(['booking' => $this->bookingShape(DB::table('bookings')->where('id', $id)->first())], 201);
    }

    public function updateBooking(Request $request, int $id)
    {
        $exists = DB::table('bookings')->where('id', $id)->exists();
        if (! $exists) {
            return response()->json(['message' => 'Booking not found.'], 404);
        }

        DB::table('bookings')->where('id', $id)->update([
            'name' => (string) $request->input('name'),
            'email' => (string) $request->input('email', ''),
            'phone' => (string) $request->input('phone', ''),
            'service' => (string) $request->input('service', ''),
            'message' => (string) $request->input('message', ''),
            'status' => (string) $request->input('status', 'open'),
            'scheduled_at' => (string) $request->input('scheduledAt', ''),
            'updated_at' => now(),
        ]);

        return ['booking' => $this->bookingShape(DB::table('bookings')->where('id', $id)->first())];
    }

    public function bookingEventTypes()
    {
        if (! Schema::hasTable('booking_event_types')) {
            return ['eventTypes' => []];
        }

        return [
            'eventTypes' => DB::table('booking_event_types')
                ->where('is_active', true)
                ->when(request('calendar'), fn ($query, $slug) => $query->whereIn('booking_calendar_id', DB::table('booking_calendars')->where('slug', $slug)->pluck('id')))
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->bookingEventTypeShape($row)),
        ];
    }

    public function bookingCalendars()
    {
        if (! Schema::hasTable('booking_calendars')) {
            return ['calendars' => []];
        }

        return [
            'calendars' => DB::table('booking_calendars')
                ->where('is_active', true)
                ->orderByDesc('id')
                ->get()
                ->map(fn ($calendar) => [
                    'id' => $calendar->id,
                    'name' => $calendar->name,
                    'slug' => $calendar->slug,
                    'description' => $calendar->description ?: '',
                    'timezone' => $calendar->timezone,
                    'color' => $calendar->color,
                    'settings' => json_decode($calendar->settings_json ?: '{}', true) ?: [],
                    'publicUrl' => '/book/'.$calendar->slug,
                    'isActive' => (bool) $calendar->is_active,
                ]),
        ];
    }

    public function bookingCalendar(string $slug)
    {
        $calendar = DB::table('booking_calendars')->where('slug', $slug)->where('is_active', true)->first();
        if (! $calendar) {
            return response()->json(['message' => 'Calendar not found.'], 404);
        }

        return [
            'calendar' => [
                'id' => $calendar->id,
                'name' => $calendar->name,
                'slug' => $calendar->slug,
                'description' => $calendar->description ?: '',
                'timezone' => $calendar->timezone,
                'color' => $calendar->color,
                'settings' => json_decode($calendar->settings_json ?: '{}', true) ?: [],
            ],
            'eventTypes' => DB::table('booking_event_types')
                ->where('booking_calendar_id', $calendar->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn ($row) => $this->bookingEventTypeShape($row)),
        ];
    }

    public function bookingAvailability(Request $request, string $slug)
    {
        $eventType = DB::table('booking_event_types')->where('slug', $slug)->where('is_active', true)->first();
        if (! $eventType) {
            return response()->json(['message' => 'Booking type not found.'], 404);
        }

        $displayTimezone = $this->validTimezone((string) $request->input('timezone', $eventType->timezone), $eventType->timezone);
        $from = $request->input('from') ? Carbon::parse((string) $request->input('from'), $eventType->timezone) : now($eventType->timezone);
        $to = $request->input('to')
            ? Carbon::parse((string) $request->input('to'), $eventType->timezone)
            : $from->copy()->addDays((int) $eventType->max_future_days);

        return [
            'eventType' => $this->bookingEventTypeShape($eventType),
            'availability' => $this->availableSlots($eventType, $from, $to, $displayTimezone),
        ];
    }

    public function bookPublicAppointment(Request $request)
    {
        return $this->storeBooking($request, false);
    }

    public function updateSettings(Request $request, DeploymentMaintenanceService $maintenance)
    {
        if ($request->input('_systemAction') === 'deployment-maintenance') {
            $admin = $request->attributes->get('admin');

            if (($admin?->role ?? '') !== 'admin') {
                return response()->json(['message' => 'You do not have permission to perform this action.'], 403);
            }

            return $maintenance->run();
        }

        foreach ($request->all() as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                ['value' => (string) $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        return ['settings' => $this->settings()];
    }

    public function media()
    {
        return ['media' => $this->mediaList()];
    }

    public function uploadMedia(Request $request)
    {
        if ($request->hasFile('file') && ! $request->file('file')->isValid()) {
            return response()->json([
                'message' => 'The upload did not reach the server correctly. Check the file size and server upload limits.',
            ], 422);
        }

        $data = $request->validate([
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,gif,webp,avif,heic,heif,pdf,mp4,webm,mov,ogg', 'max:51200'],
        ]);
        $file = $data['file'];
        $extension = strtolower($file->getClientOriginalExtension());
        $filename = (string) Str::uuid().'.'.$extension;
        $uploadPath = public_path('uploads');
        if (! is_dir($uploadPath)) {
            if (! @mkdir($uploadPath, 0755, true) && ! is_dir($uploadPath)) {
                return response()->json(['message' => 'Unable to create the uploads directory. Check public/uploads permissions.'], 500);
            }
        }

        if (! is_writable($uploadPath)) {
            return response()->json(['message' => 'The uploads directory is not writable. Check public/uploads permissions.'], 500);
        }

        try {
            $file->move($uploadPath, $filename);
        } catch (\Throwable $error) {
            report($error);

            return response()->json(['message' => 'Unable to save the uploaded file. Check upload size and folder permissions.'], 500);
        }

        $mediaPayload = [
            'filename' => $filename,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize() ?: 0,
            'url' => '/uploads/'.$filename,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (! Schema::hasTable('media')) {
            return response()->json(['media' => $this->mediaShape((object) array_merge(['id' => 0], $mediaPayload))], 201);
        }

        try {
            $id = DB::table('media')->insertGetId(array_intersect_key($mediaPayload, array_flip(Schema::getColumnListing('media'))));
        } catch (\Throwable $error) {
            report($error);
            $savedPath = $uploadPath.DIRECTORY_SEPARATOR.$filename;
            if (is_file($savedPath)) {
                @unlink($savedPath);
            }

            return response()->json([
                'message' => 'The file uploaded, but the media library could not save it. Run migrations and check the media table.',
            ], 500);
        }

        return response()->json(['media' => $this->mediaShape(DB::table('media')->where('id', $id)->first())], 201);
    }

    public function deleteMedia(int $id)
    {
        $media = DB::table('media')->where('id', $id)->first();
        if (! $media) {
            return response()->json(['message' => 'Media not found.'], 404);
        }

        $path = public_path('uploads/'.$media->filename);
        if (is_file($path)) {
            unlink($path);
        }

        DB::table('media')->where('id', $id)->delete();

        return response()->noContent();
    }

    public function createProject(Request $request)
    {
        $payload = $this->projectPayload($request);
        if ($payload['title'] === '' || $payload['category'] === '') {
            return response()->json(['message' => 'Title and category are required.'], 400);
        }

        $payload['slug'] = $this->uniqueSlug('projects', $payload['slug'] ?: $payload['title']);
        $payload['created_at'] = now();
        $payload['updated_at'] = now();
        $id = DB::table('projects')->insertGetId($payload);

        return response()->json(['project' => $this->projectShape(DB::table('projects')->where('id', $id)->first())], 201);
    }

    public function updateProject(Request $request, int $id)
    {
        $existing = DB::table('projects')->where('id', $id)->first();
        if (! $existing) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        $payload = $this->projectPayload($request, $existing);
        $payload['slug'] = $this->uniqueSlug('projects', $payload['slug'] ?: $payload['title'], $id);
        $payload['updated_at'] = now();

        DB::table('projects')->where('id', $id)->update($payload);

        return ['project' => $this->projectShape(DB::table('projects')->where('id', $id)->first())];
    }

    public function deleteProject(int $id)
    {
        $deleted = DB::table('projects')->where('id', $id)->delete();
        if (! $deleted) {
            return response()->json(['message' => 'Project not found.'], 404);
        }

        return response()->noContent();
    }

    public function trackVisit(Request $request)
    {
        DB::table('visits')->insert([
            'path' => (string) $request->input('path', '/'),
            'referrer' => (string) $request->input('referrer', ''),
            'user_agent' => (string) $request->userAgent(),
            'ip' => (string) $request->ip(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->noContent();
    }

    private function projectQuery(bool $includeDrafts)
    {
        $query = DB::table('projects');

        if (! $includeDrafts) {
            $query->where('status', 'published');
        }

        if (Schema::hasColumn('projects', 'sort_order')) {
            $query->orderBy('sort_order');
        }

        return $query->orderByDesc('updated_at')->get();
    }

    private function reviewQuery(bool $includeUnpublished)
    {
        $query = DB::table('reviews');

        if (! $includeUnpublished) {
            $query->where('is_published', true);
        }

        return $query->orderByDesc('is_featured')->orderByDesc('reviewed_at')->orderByDesc('created_at');
    }

    private function projectPayload(Request $request, ?object $existing = null): array
    {
        $services = $request->input('services', $existing?->services_json ? json_decode($existing->services_json, true) : []);
        if (! is_array($services)) {
            $services = collect(explode(',', (string) $services))->map(fn ($item) => trim($item))->filter()->values()->all();
        }

        $metrics = $request->input('metrics', $existing?->metrics_json ? json_decode($existing->metrics_json, true) : []);
        if (! is_array($metrics)) {
            $metrics = [];
        }

        $payload = [
            'title' => trim((string) $request->input('title', $existing?->title ?? '')),
            'slug' => trim((string) $request->input('slug', $existing?->slug ?? '')),
            'category' => trim((string) $request->input('category', $existing?->category ?? '')),
            'summary' => trim((string) $request->input('summary', $existing?->summary ?? '')),
            'description' => trim((string) $request->input('description', $existing?->description ?? '')),
            'image' => trim((string) $request->input('image', $existing?->image ?? '')),
            'cover_image' => trim((string) $request->input('coverImage', $request->input('cover_image', $existing?->cover_image ?? ''))),
            'video_url' => trim((string) $request->input('videoUrl', $request->input('video_url', $existing?->video_url ?? ''))),
            'website_url' => trim((string) $request->input('websiteUrl', $request->input('website_url', $existing?->website_url ?? ''))),
            'services_json' => json_encode($services),
            'metrics_json' => json_encode($metrics),
            'is_featured' => (bool) $request->input('isFeatured', $request->input('is_featured', $existing?->is_featured ?? false)),
            'status' => $request->input('status', $existing?->status ?? 'published') === 'draft' ? 'draft' : 'published',
        ];

        if (Schema::hasColumn('projects', 'sort_order')) {
            $requestedSortOrder = (int) $request->input('sortOrder', $request->input('sort_order', 0));
            $payload['sort_order'] = $requestedSortOrder > 0
                ? $requestedSortOrder
                : (int) ($existing?->sort_order ?? ((int) DB::table('projects')->max('sort_order') + 1));
        }

        return array_intersect_key($payload, array_flip(Schema::getColumnListing('projects')));
    }

    private function reviewPayload(Request $request, ?object $existing = null): array
    {
        $provider = strtolower(trim((string) $request->input('provider', $existing?->provider ?? 'google')));
        $allowedProviders = ['google', 'trustpilot', 'facebook', 'instagram', 'linkedin', 'website', 'manual'];
        if (! in_array($provider, $allowedProviders, true)) {
            $provider = 'manual';
        }

        return [
            'review_source_id' => $existing?->review_source_id,
            'provider' => $provider,
            'external_id' => $existing?->external_id ?? '',
            'author_name' => trim((string) $request->input('authorName', $request->input('author_name', $existing?->author_name ?? ''))),
            'author_image' => trim((string) $request->input('authorImage', $request->input('author_image', $existing?->author_image ?? ''))),
            'rating' => max(1, min(5, (int) $request->input('rating', $existing?->rating ?? 5))),
            'content' => trim((string) $request->input('content', $existing?->content ?? '')),
            'external_url' => trim((string) $request->input('externalUrl', $request->input('external_url', $existing?->external_url ?? ''))),
            'reviewed_at' => trim((string) $request->input('reviewedAt', $request->input('reviewed_at', $existing?->reviewed_at ?? now()->toDateString()))),
            'is_featured' => (bool) $request->input('isFeatured', $request->input('is_featured', $existing?->is_featured ?? true)),
            'is_published' => (bool) $request->input('isPublished', $request->input('is_published', $existing?->is_published ?? true)),
        ];
    }

    private function reviewSourceId(string $provider): int
    {
        $name = $this->providerLabel($provider);

        DB::table('review_sources')->updateOrInsert(
            ['provider' => $provider],
            ['name' => $name, 'enabled' => true, 'updated_at' => now(), 'created_at' => now()]
        );

        return (int) DB::table('review_sources')->where('provider', $provider)->value('id');
    }

    private function settings(): array
    {
        return array_merge($this->defaultSettings(), DB::table('settings')->pluck('value', 'key')->all());
    }

    private function defaultSettings(): array
    {
        return SiteDefaults::settings();
    }

    private function storeBooking(Request $request, bool $adminCreated)
    {
        $eventType = DB::table('booking_event_types')
            ->where('id', (int) $request->input('eventTypeId'))
            ->when(! $adminCreated, fn ($query) => $query->where('is_active', true))
            ->first();

        if (! $eventType) {
            return response()->json(['message' => 'Booking type is required.'], 422);
        }

        $name = trim((string) $request->input('name'));
        $email = strtolower(trim((string) $request->input('email')));
        $startsAt = (string) $request->input('startsAt');

        if ($name === '' || $email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL) || $startsAt === '') {
            return response()->json(['message' => 'Name, valid email, and appointment time are required.'], 422);
        }

        $attendeeTimezone = $this->validTimezone((string) $request->input('timezone', $eventType->timezone), $eventType->timezone);
        $start = Carbon::parse($startsAt, $attendeeTimezone)->setTimezone($eventType->timezone);
        $end = $start->copy()->addMinutes((int) $eventType->duration_minutes);
        $minimumStart = now($eventType->timezone)->addHours((int) $eventType->min_notice_hours);
        if (! $adminCreated && $start->lessThan($minimumStart)) {
            return response()->json(['message' => 'Please choose a later time.'], 422);
        }

        if (! $this->slotIsAvailable($eventType, $start)) {
            return response()->json(['message' => 'That time is no longer available.'], 409);
        }

        $selectedLocation = $this->selectedBookingLocation($eventType, (string) $request->input('meetingPlatform', ''));

        $id = DB::table('bookings')->insertGetId([
            'booking_event_type_id' => $eventType->id,
            'booking_calendar_id' => $eventType->booking_calendar_id ?? null,
            'name' => $name,
            'email' => $email,
            'phone' => trim((string) $request->input('phone', '')),
            'service' => (string) $request->input('service', $eventType->name),
            'message' => trim((string) $request->input('message', '')),
            'status' => (string) $request->input('status', 'confirmed'),
            'scheduled_at' => $start->toDateTimeString(),
            'timezone' => $eventType->timezone,
            ...$this->attendeeTimezonePayload($attendeeTimezone),
            'starts_at' => $start->toDateTimeString(),
            'ends_at' => $end->toDateTimeString(),
            'duration_minutes' => $eventType->duration_minutes,
            'price_amount' => $eventType->payment_required ? (float) ($eventType->price_amount ?? 0) : 0,
            'currency' => $eventType->currency ?? 'NGN',
            'payment_provider' => $eventType->payment_required ? 'paystack' : null,
            'payment_status' => $eventType->payment_required ? 'unpaid' : 'not_required',
            'location_type' => $selectedLocation['type'],
            'location_value' => $selectedLocation['value'],
            'google_calendar_sync_status' => 'not_configured',
            'cancel_token' => (string) Str::uuid(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $booking = DB::table('bookings')->where('id', $id)->first();
        $zoomSync = app(ZoomMeetingService::class)->createBookingMeeting($booking, $eventType);

        if (($zoomSync['status'] ?? '') === 'synced' && ! empty($zoomSync['joinUrl'])) {
            DB::table('bookings')->where('id', $id)->update([
                'location_value' => $zoomSync['joinUrl'],
                'updated_at' => now(),
            ]);
            $booking = DB::table('bookings')->where('id', $id)->first();
        }

        $sync = app(GoogleCalendarService::class)->createBookingEvent($booking, $eventType);

        $generatedMeetLink = $this->isGoogleMeetUrl((string) ($sync['locationValue'] ?? ''));

        DB::table('bookings')->where('id', $id)->update([
            'google_calendar_event_id' => $sync['eventId'] ?? null,
            'google_calendar_event_url' => $sync['eventUrl'] ?? null,
            'google_calendar_sync_status' => $sync['status'] === 'not_configured' && ($zoomSync['status'] ?? '') === 'synced' ? 'zoom_synced' : $sync['status'],
            ...$this->googleCalendarSyncErrorPayload($sync['error'] ?? null),
            'location_type' => $generatedMeetLink ? 'google_meet' : $booking->location_type,
            'location_value' => $sync['locationValue'] ?? $booking->location_value,
            'updated_at' => now(),
        ]);

        app(BookingNotificationService::class)->bookingCreated($id);

        $bookingResponse = $this->bookingShape(DB::table('bookings')->where('id', $id)->first());
        $bookingResponse['googleCalendarSyncError'] = (string) ($sync['error'] ?? $bookingResponse['googleCalendarSyncError'] ?? '');

        return response()->json(['booking' => $bookingResponse], 201);
    }

    private function selectedBookingLocation(object $eventType, string $selectedId): array
    {
        $fallback = [
            'type' => $eventType->location_type,
            'value' => $eventType->location_label,
        ];

        if (! $selectedId || empty($eventType->booking_calendar_id)) {
            return $fallback;
        }

        $calendar = DB::table('booking_calendars')->where('id', $eventType->booking_calendar_id)->first();
        if (! $calendar) {
            return $fallback;
        }

        $settings = json_decode($calendar->settings_json ?: '{}', true);
        $locations = is_array($settings) && isset($settings['locations']) && is_array($settings['locations']) ? $settings['locations'] : [];

        foreach ($locations as $location) {
            if (($location['id'] ?? '') === $selectedId && ($location['enabled'] ?? true)) {
                return [
                    'type' => (string) ($location['type'] ?? $fallback['type']),
                    'value' => trim((string) (($location['details'] ?? '') ?: ($location['label'] ?? $fallback['value']))),
                ];
            }
        }

        return $fallback;
    }

    private function isGoogleMeetUrl(string $value): bool
    {
        return (bool) preg_match('#^https://meet\.google\.com/[a-z0-9-]+#i', trim($value));
    }

    private function availableSlots(object $eventType, Carbon $from, Carbon $to, ?string $displayTimezone = null): array
    {
        $displayTimezone = $this->validTimezone($displayTimezone ?: $eventType->timezone, $eventType->timezone);
        $slots = [];
        $cursor = $from->copy()->startOfDay();
        $limit = $to->copy()->endOfDay();

        while ($cursor->lessThanOrEqualTo($limit) && count($slots) < 220) {
            $dayName = strtolower($cursor->englishDayOfWeek);
            foreach ($this->eventAvailability($eventType)[$dayName] ?? [] as $window) {
                $slot = $cursor->copy()->setTimeFromTimeString($window['start']);
                $windowEnd = $cursor->copy()->setTimeFromTimeString($window['end']);

                while ($slot->copy()->addMinutes((int) $eventType->duration_minutes)->lessThanOrEqualTo($windowEnd)) {
                    if ($slot->greaterThanOrEqualTo($from) && $slot->lessThanOrEqualTo($limit) && $this->slotIsAvailable($eventType, $slot)) {
                        $displaySlot = $slot->copy()->setTimezone($displayTimezone);
                        $slots[] = [
                            'date' => $displaySlot->toDateString(),
                            'time' => $displaySlot->format('H:i'),
                            'label' => $displaySlot->format('g:i A'),
                            'startsAt' => $slot->toIso8601String(),
                            'timezone' => $displayTimezone,
                        ];
                    }
                    $slot->addMinutes((int) $eventType->duration_minutes + (int) $eventType->buffer_minutes);
                }
            }
            $cursor->addDay();
        }

        return collect($slots)->groupBy('date')->map(fn ($items, $date) => [
            'date' => $date,
            'label' => Carbon::parse($date, $displayTimezone)->format('D, M j'),
            'slots' => $items->values(),
        ])->values()->all();
    }

    private function validTimezone(string $timezone, string $fallback = 'Africa/Lagos'): string
    {
        return in_array($timezone, timezone_identifiers_list(), true) ? $timezone : $fallback;
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

    private function slotIsAvailable(object $eventType, Carbon $start): bool
    {
        $end = $start->copy()->addMinutes((int) $eventType->duration_minutes);
        $minimumStart = now($eventType->timezone)->addHours((int) $eventType->min_notice_hours);
        if ($start->lessThan($minimumStart)) {
            return false;
        }

        $dayName = strtolower($start->englishDayOfWeek);
        $insideWindow = collect($this->eventAvailability($eventType)[$dayName] ?? [])->contains(function ($window) use ($start, $end) {
            $windowStart = $start->copy()->setTimeFromTimeString($window['start']);
            $windowEnd = $start->copy()->setTimeFromTimeString($window['end']);

            return $start->greaterThanOrEqualTo($windowStart) && $end->lessThanOrEqualTo($windowEnd);
        });

        if (! $insideWindow) {
            return false;
        }

        return ! DB::table('bookings')
            ->where('booking_event_type_id', $eventType->id)
            ->whereNotIn('status', ['cancelled', 'closed'])
            ->where(function ($query) use ($start, $end) {
                $query->where('starts_at', '<', $end->toDateTimeString())
                    ->where('ends_at', '>', $start->toDateTimeString());
            })
            ->exists();
    }

    private function eventAvailability(object $eventType): array
    {
        $decoded = json_decode($eventType->availability_json ?: '{}', true);

        return is_array($decoded) ? $decoded : [];
    }

    private function bookingEventTypeShape(object $row, bool $includeAvailability = false): array
    {
        $shape = [
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
            'isActive' => (bool) $row->is_active,
        ];

        if ($includeAvailability) {
            $shape['availability'] = $this->eventAvailability($row);
        }

        return $shape;
    }

    private function uniqueSlug(string $table, string $title, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($title) ?: $table.'-'.time();
        $candidate = $baseSlug;
        $index = 2;

        while (DB::table($table)->where('slug', $candidate)->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))->exists()) {
            $candidate = $baseSlug.'-'.$index;
            $index++;
        }

        return $candidate;
    }

    private function pagePayload(Request $request, object $existing): array
    {
        $title = trim((string) $request->input('title', $existing->title));
        $status = in_array($request->input('status', $existing->status), ['published', 'draft'], true)
            ? (string) $request->input('status', $existing->status)
            : 'draft';

        return [
            'title' => $title,
            'slug' => $this->uniqueSlug('pages', (string) $request->input('slug', $title), (int) $existing->id),
            'template' => (string) $request->input('template', $existing->template ?? 'default'),
            'parent_id' => $request->filled('parentId') ? (int) $request->input('parentId') : null,
            'sort_order' => (int) $request->input('sortOrder', $existing->sort_order ?? 0),
            'content' => (string) $request->input('content', $existing->content ?? ''),
            'excerpt' => (string) $request->input('excerpt', $existing->excerpt ?? ''),
            'seo_title' => (string) $request->input('seoTitle', $existing->seo_title ?? ''),
            'seo_description' => (string) $request->input('seoDescription', $existing->seo_description ?? ''),
            'canonical_url' => (string) $request->input('canonicalUrl', $existing->canonical_url ?? ''),
            'meta_robots' => (string) $request->input('metaRobots', $existing->meta_robots ?? 'index,follow'),
            'focus_keyword' => (string) $request->input('focusKeyword', $existing->focus_keyword ?? ''),
            'og_title' => (string) $request->input('ogTitle', $existing->og_title ?? ''),
            'og_description' => (string) $request->input('ogDescription', $existing->og_description ?? ''),
            'og_image' => (string) $request->input('ogImage', $existing->og_image ?? ''),
            'twitter_title' => (string) $request->input('twitterTitle', $existing->twitter_title ?? ''),
            'twitter_description' => (string) $request->input('twitterDescription', $existing->twitter_description ?? ''),
            'twitter_image' => (string) $request->input('twitterImage', $existing->twitter_image ?? ''),
            'schema_type' => (string) $request->input('schemaType', $existing->schema_type ?? 'WebPage'),
            'schema_json' => (string) $request->input('schemaJson', $existing->schema_json ?? ''),
            'status' => $status,
            'published_at' => $status === 'published' ? ($existing->published_at ?? now()) : null,
        ];
    }

    private function adminShape(object $row): array
    {
        return ['id' => $row->id, 'email' => $row->email, 'name' => $row->name, 'role' => $row->role ?? 'admin', 'twoFactorEnabled' => (bool) ($row->two_factor_enabled ?? false)];
    }

    private function adminUserShape(object $row): array
    {
        return ['id' => $row->id, 'email' => $row->email, 'name' => $row->name, 'role' => $row->role ?? 'admin', 'twoFactorEnabled' => (bool) ($row->two_factor_enabled ?? false), 'createdAt' => (string) $row->created_at];
    }

    private function generateTotpSecret(): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        for ($i = 0; $i < 32; $i++) {
            $secret .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $secret;
    }

    private function validTotpCode(object $admin, string $code): bool
    {
        $code = preg_replace('/\D+/', '', $code);
        if (strlen($code) !== 6 || empty($admin->two_factor_secret)) {
            return false;
        }

        try {
            $secret = Crypt::decryptString($admin->two_factor_secret);
        } catch (\Throwable) {
            return false;
        }

        $counter = intdiv(time(), 30);
        for ($window = -1; $window <= 1; $window++) {
            if (hash_equals($this->totpCode($secret, $counter + $window), $code)) {
                return true;
            }
        }

        return false;
    }

    private function totpCode(string $secret, int $counter): string
    {
        $key = $this->base32Decode($secret);
        $binaryCounter = pack('N*', 0).pack('N*', $counter);
        $hash = hash_hmac('sha1', $binaryCounter, $key, true);
        $offset = ord(substr($hash, -1)) & 0x0F;
        $value = ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF);

        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private function base32Decode(string $secret): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = strtoupper(preg_replace('/[^A-Z2-7]/', '', $secret));
        $bits = '';
        $decoded = '';

        foreach (str_split($secret) as $char) {
            $value = strpos($alphabet, $char);
            if ($value === false) {
                continue;
            }
            $bits .= str_pad(decbin($value), 5, '0', STR_PAD_LEFT);
        }

        foreach (str_split($bits, 8) as $byte) {
            if (strlen($byte) === 8) {
                $decoded .= chr(bindec($byte));
            }
        }

        return $decoded;
    }

    private function totpUri(string $email, string $secret): string
    {
        $issuer = 'Bakhtech Admin';

        return 'otpauth://totp/'.rawurlencode($issuer.':'.$email)
            .'?secret='.rawurlencode($secret)
            .'&issuer='.rawurlencode($issuer)
            .'&algorithm=SHA1&digits=6&period=30';
    }

    private function projectShape(object $row): array
    {
        return [
            'id' => $row->id,
            'title' => $row->title,
            'slug' => $row->slug,
            'category' => $row->category,
            'summary' => $row->summary ?: '',
            'description' => $row->description ?: '',
            'image' => $row->image ?: '',
            'coverImage' => ($row->cover_image ?? '') ?: '',
            'videoUrl' => ($row->video_url ?? '') ?: '',
            'websiteUrl' => ($row->website_url ?? '') ?: '',
            'services' => json_decode(($row->services_json ?? '') ?: '[]', true),
            'metrics' => json_decode(($row->metrics_json ?? '') ?: '{}', true),
            'isFeatured' => (bool) ($row->is_featured ?? false),
            'status' => $row->status,
            'sortOrder' => (int) ($row->sort_order ?? 0),
            'createdAt' => (string) $row->created_at,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function mediaList()
    {
        return DB::table('media')->orderByDesc('created_at')->get()->map(fn ($row) => $this->mediaShape($row));
    }

    private function mediaShape(object $row): array
    {
        return [
            'id' => (int) $row->id,
            'filename' => $row->filename ?? '',
            'originalName' => $row->original_name ?? ($row->filename ?? 'Uploaded file'),
            'mimeType' => $row->mime_type ?? 'application/octet-stream',
            'size' => (int) ($row->size ?? 0),
            'url' => $row->url ?? (($row->filename ?? '') ? '/uploads/'.$row->filename : ''),
            'createdAt' => (string) ($row->created_at ?? ''),
        ];
    }

    private function reviewShape(object $row): array
    {
        return [
            'id' => $row->id,
            'provider' => $row->provider,
            'providerLabel' => $this->providerLabel($row->provider),
            'authorName' => $row->author_name,
            'authorImage' => $row->author_image ?: '',
            'rating' => (int) $row->rating,
            'content' => $row->content,
            'externalUrl' => $row->external_url ?: '',
            'reviewedAt' => $row->reviewed_at ?: '',
            'isFeatured' => (bool) $row->is_featured,
            'isPublished' => (bool) $row->is_published,
            'createdAt' => (string) $row->created_at,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function providerLabel(string $provider): string
    {
        return [
            'google' => 'Google',
            'trustpilot' => 'Trustpilot',
            'facebook' => 'Facebook',
            'instagram' => 'Instagram',
            'linkedin' => 'LinkedIn',
            'website' => 'Website',
            'manual' => 'Manual',
        ][$provider] ?? 'Manual';
    }

    private function pageShape(object $row): array
    {
        return [
            'id' => $row->id,
            'title' => $row->title,
            'slug' => $row->slug,
            'template' => $row->template ?? 'default',
            'parentId' => $row->parent_id ?? null,
            'sortOrder' => (int) ($row->sort_order ?? 0),
            'content' => $row->content ?: '',
            'excerpt' => $row->excerpt ?? '',
            'seoTitle' => $row->seo_title ?: '',
            'seoDescription' => $row->seo_description ?: '',
            'canonicalUrl' => $row->canonical_url ?? '',
            'metaRobots' => $row->meta_robots ?? 'index,follow',
            'focusKeyword' => $row->focus_keyword ?? '',
            'ogTitle' => $row->og_title ?? '',
            'ogDescription' => $row->og_description ?? '',
            'ogImage' => $row->og_image ?? '',
            'twitterTitle' => $row->twitter_title ?? '',
            'twitterDescription' => $row->twitter_description ?? '',
            'twitterImage' => $row->twitter_image ?? '',
            'schemaType' => $row->schema_type ?? 'WebPage',
            'schemaJson' => $row->schema_json ?? '',
            'status' => $row->status,
            'publishedAt' => (string) ($row->published_at ?? ''),
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function postShape(object $row): array
    {
        return [
            'id' => $row->id,
            'title' => $row->title,
            'slug' => $row->slug,
            'excerpt' => $row->excerpt ?: '',
            'content' => $row->content ?: '',
            'category' => $row->category ?: '',
            'image' => $row->image ?: '',
            'status' => $row->status,
            'createdAt' => (string) $row->created_at,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function bookingShape(object $row): array
    {
        return [
            'id' => $row->id,
            'eventTypeId' => $row->booking_event_type_id ?? null,
            'name' => $row->name,
            'email' => $row->email ?: '',
            'phone' => $row->phone ?: '',
            'service' => $row->service ?: '',
            'message' => $row->message ?: '',
            'status' => $row->status,
            'scheduledAt' => $row->scheduled_at ?: '',
            'startsAt' => $row->starts_at ?? ($row->scheduled_at ?: ''),
            'endsAt' => $row->ends_at ?? '',
            'timezone' => $row->timezone ?? '',
            'attendeeTimezone' => $row->attendee_timezone ?? ($row->timezone ?? ''),
            'durationMinutes' => (int) ($row->duration_minutes ?? 30),
            'locationType' => $row->location_type ?? '',
            'locationValue' => $row->location_value ?? '',
            'googleCalendarEventUrl' => $row->google_calendar_event_url ?? '',
            'googleCalendarSyncStatus' => $row->google_calendar_sync_status ?? 'not_configured',
            'googleCalendarSyncError' => Schema::hasColumn('bookings', 'google_calendar_sync_error') ? ($row->google_calendar_sync_error ?? '') : '',
            'reminderSentAt' => (string) ($row->reminder_sent_at ?? ''),
            'createdAt' => (string) $row->created_at,
        ];
    }
}
