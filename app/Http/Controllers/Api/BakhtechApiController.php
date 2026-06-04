<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AdminToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class BakhtechApiController extends Controller
{
    public function health()
    {
        return ['ok' => true, 'service' => 'bakhtech-api'];
    }

    public function login(Request $request)
    {
        $email = strtolower(trim((string) $request->input('email')));
        $password = (string) $request->input('password');
        $admin = DB::table('admins')->where('email', $email)->first();

        if (!$admin || !Hash::check($password, $admin->password_hash)) {
            return response()->json(['message' => 'Invalid email or password.'], 401);
        }

        return [
            'token' => AdminToken::make($admin),
            'admin' => $this->adminShape($admin),
        ];
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
        return ['settings' => $this->settings()];
    }

    public function publicReviews()
    {
        if (!Schema::hasTable('reviews')) {
            return ['reviews' => []];
        }

        return ['reviews' => $this->reviewQuery(false)->limit(6)->get()->map(fn ($row) => $this->reviewShape($row))];
    }

    public function cms()
    {
        return [
            'pages' => DB::table('pages')->orderBy('id')->get()->map(fn ($row) => $this->pageShape($row)),
            'posts' => DB::table('posts')->orderByDesc('updated_at')->get()->map(fn ($row) => $this->postShape($row)),
            'bookings' => DB::table('bookings')->orderByDesc('created_at')->get()->map(fn ($row) => $this->bookingShape($row)),
            'reviews' => Schema::hasTable('reviews') ? $this->reviewQuery(true)->get()->map(fn ($row) => $this->reviewShape($row)) : collect(),
            'users' => DB::table('admins')->orderBy('id')->get()->map(fn ($row) => $this->adminUserShape($row)),
            'settings' => $this->settings(),
            'media' => $this->mediaList(),
        ];
    }

    public function updatePage(Request $request, int $id)
    {
        $exists = DB::table('pages')->where('id', $id)->exists();
        if (!$exists) {
            return response()->json(['message' => 'Page not found.'], 404);
        }

        DB::table('pages')->where('id', $id)->update([
            'title' => (string) $request->input('title'),
            'content' => (string) $request->input('content', ''),
            'seo_title' => (string) $request->input('seoTitle', ''),
            'seo_description' => (string) $request->input('seoDescription', ''),
            'status' => (string) $request->input('status', 'published'),
            'updated_at' => now(),
        ]);

        return ['page' => $this->pageShape(DB::table('pages')->where('id', $id)->first())];
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
        if (!$exists) {
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
        $payload['external_id'] = 'manual-' . Str::uuid();
        $payload['created_at'] = now();
        $payload['updated_at'] = now();

        $id = DB::table('reviews')->insertGetId($payload);

        return response()->json(['review' => $this->reviewShape(DB::table('reviews')->where('id', $id)->first())], 201);
    }

    public function updateReview(Request $request, int $id)
    {
        $existing = DB::table('reviews')->where('id', $id)->first();
        if (!$existing) {
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

    public function createBooking(Request $request)
    {
        $id = DB::table('bookings')->insertGetId([
            'name' => (string) $request->input('name', 'Website visitor'),
            'email' => (string) $request->input('email', ''),
            'phone' => (string) $request->input('phone', ''),
            'service' => (string) $request->input('service', ''),
            'message' => (string) $request->input('message', ''),
            'status' => (string) $request->input('status', 'open'),
            'scheduled_at' => (string) $request->input('scheduledAt', ''),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['booking' => $this->bookingShape(DB::table('bookings')->where('id', $id)->first())], 201);
    }

    public function updateBooking(Request $request, int $id)
    {
        $exists = DB::table('bookings')->where('id', $id)->exists();
        if (!$exists) {
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

    public function updateSettings(Request $request)
    {
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
        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'File is required.'], 400);
        }

        $file = $request->file('file');
        $safeName = strtolower(preg_replace('/[^a-zA-Z0-9.]+/', '-', $file->getClientOriginalName()));
        $filename = time() . '-' . $safeName;
        $file->move(public_path('uploads'), $filename);

        $id = DB::table('media')->insertGetId([
            'filename' => $filename,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getClientMimeType() ?: 'application/octet-stream',
            'size' => $file->getSize() ?: 0,
            'url' => '/uploads/' . $filename,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['media' => $this->mediaShape(DB::table('media')->where('id', $id)->first())], 201);
    }

    public function deleteMedia(int $id)
    {
        $media = DB::table('media')->where('id', $id)->first();
        if (!$media) {
            return response()->json(['message' => 'Media not found.'], 404);
        }

        $path = public_path('uploads/' . $media->filename);
        if (is_file($path)) {
            unlink($path);
        }

        DB::table('media')->where('id', $id)->delete();

        return response()->noContent();
    }

    public function createProject(Request $request)
    {
        $payload = $this->projectPayload($request);
        if ($payload['title'] === '' || $payload['category'] === '' || $payload['summary'] === '') {
            return response()->json(['message' => 'Title, category, and summary are required.'], 400);
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
        if (!$existing) {
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
        if (!$deleted) {
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

        if (!$includeDrafts) {
            $query->where('status', 'published')->orderByDesc('is_featured');
        }

        return $query->orderByDesc('updated_at')->get();
    }

    private function reviewQuery(bool $includeUnpublished)
    {
        $query = DB::table('reviews');

        if (!$includeUnpublished) {
            $query->where('is_published', true);
        }

        return $query->orderByDesc('is_featured')->orderByDesc('reviewed_at')->orderByDesc('created_at');
    }

    private function projectPayload(Request $request, ?object $existing = null): array
    {
        $services = $request->input('services', $existing?->services_json ? json_decode($existing->services_json, true) : []);
        if (!is_array($services)) {
            $services = collect(explode(',', (string) $services))->map(fn ($item) => trim($item))->filter()->values()->all();
        }

        $metrics = $request->input('metrics', $existing?->metrics_json ? json_decode($existing->metrics_json, true) : []);
        if (!is_array($metrics)) {
            $metrics = [];
        }

        return [
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
    }

    private function reviewPayload(Request $request, ?object $existing = null): array
    {
        $provider = strtolower(trim((string) $request->input('provider', $existing?->provider ?? 'google')));
        $allowedProviders = ['google', 'trustpilot', 'facebook', 'instagram', 'linkedin', 'website', 'manual'];
        if (!in_array($provider, $allowedProviders, true)) {
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
        return [
            'siteName' => 'Bakhtech Solutions',
            'contactEmail' => 'solutions@bakhtech.com.ng',
            'phone' => '+234 708 637 2833',
            'activeHome' => 'home',
            'homePortfolioShowDescriptions' => 'true',
            'googleReviewUrl' => '',
            'trustpilotReviewUrl' => '',
        ];
    }

    private function uniqueSlug(string $table, string $title, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($title) ?: $table . '-' . time();
        $candidate = $baseSlug;
        $index = 2;

        while (DB::table($table)->where('slug', $candidate)->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))->exists()) {
            $candidate = $baseSlug . '-' . $index;
            $index++;
        }

        return $candidate;
    }

    private function adminShape(object $row): array
    {
        return ['id' => $row->id, 'email' => $row->email, 'name' => $row->name];
    }

    private function adminUserShape(object $row): array
    {
        return ['id' => $row->id, 'email' => $row->email, 'name' => $row->name, 'role' => 'Owner', 'createdAt' => (string) $row->created_at];
    }

    private function projectShape(object $row): array
    {
        return [
            'id' => $row->id,
            'title' => $row->title,
            'slug' => $row->slug,
            'category' => $row->category,
            'summary' => $row->summary,
            'description' => $row->description ?: '',
            'image' => $row->image ?: '',
            'coverImage' => $row->cover_image ?: '',
            'videoUrl' => $row->video_url ?: '',
            'websiteUrl' => $row->website_url ?: '',
            'services' => json_decode($row->services_json ?: '[]', true),
            'metrics' => json_decode($row->metrics_json ?: '{}', true),
            'isFeatured' => (bool) $row->is_featured,
            'status' => $row->status,
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
            'id' => $row->id,
            'filename' => $row->filename,
            'originalName' => $row->original_name,
            'mimeType' => $row->mime_type,
            'size' => $row->size,
            'url' => $row->url,
            'createdAt' => (string) $row->created_at,
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
            'content' => $row->content ?: '',
            'seoTitle' => $row->seo_title ?: '',
            'seoDescription' => $row->seo_description ?: '',
            'status' => $row->status,
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
            'name' => $row->name,
            'email' => $row->email ?: '',
            'phone' => $row->phone ?: '',
            'service' => $row->service ?: '',
            'message' => $row->message ?: '',
            'status' => $row->status,
            'scheduledAt' => $row->scheduled_at ?: '',
            'createdAt' => (string) $row->created_at,
        ];
    }
}
