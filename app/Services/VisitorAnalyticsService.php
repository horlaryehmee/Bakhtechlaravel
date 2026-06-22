<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VisitorAnalyticsService
{
    public function __construct(private readonly IpGeolocationService $geolocation)
    {
    }

    public function track(Request $request, array $data): void
    {
        $sessionId = (string) ($data['sessionId'] ?? '');
        $path = Str::limit((string) ($data['path'] ?? '/'), 500, '');
        $now = now();

        if (($data['eventType'] ?? 'pageview') === 'heartbeat') {
            $visit = DB::table('visits')->where('session_id', $sessionId)->where('path', $path)->latest('id')->first();
            if ($visit) {
                DB::table('visits')->where('id', $visit->id)->update([
                    'duration_seconds' => max((int) $visit->duration_seconds, (int) ($data['durationSeconds'] ?? 0)),
                    'last_seen_at' => $now,
                    'updated_at' => $now,
                ]);
            }
            return;
        }

        $userAgent = (string) $request->userAgent();
        $location = $this->location($request);
        $source = $this->source((string) ($data['referrer'] ?? ''));

        DB::table('visits')->insert([
            'visitor_id' => (string) ($data['visitorId'] ?? ''),
            'session_id' => $sessionId,
            'path' => $path,
            'referrer' => Str::limit((string) ($data['referrer'] ?? ''), 2000, ''),
            'source' => $source['name'],
            'source_type' => $source['type'],
            'user_agent' => Str::limit($userAgent, 2000, ''),
            'ip' => (string) $request->ip(),
            'country' => $location['country'],
            'city' => $location['city'],
            'device_type' => $this->device($userAgent),
            'browser' => $this->browser($userAgent),
            'operating_system' => $this->operatingSystem($userAgent),
            'language' => Str::limit((string) ($data['language'] ?? ''), 20, ''),
            'screen_width' => $data['screenWidth'] ?? null,
            'screen_height' => $data['screenHeight'] ?? null,
            'duration_seconds' => 0,
            'last_seen_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function dashboard(int $days = 30): array
    {
        $days = min(365, max(1, $days));
        $rows = DB::table('visits')->where('created_at', '>=', now()->subDays($days))->orderByDesc('created_at')->get();
        $trackedRows = $rows->filter(fn ($row) => (string) $row->session_id !== '');
        $sessions = $trackedRows->groupBy('session_id');
        $sessionEntrances = $sessions->map(fn (Collection $visits) => $visits->last())->values();
        $liveRows = DB::table('visits')->where('last_seen_at', '>=', now()->subMinutes(2))->orderByDesc('last_seen_at')->limit(200)->get();
        $liveSessions = $liveRows->filter(fn ($row) => (string) $row->session_id !== '')->unique('session_id')->values();
        $sessionDurations = $sessions->map(fn (Collection $visits) => (int) $visits->sum('duration_seconds'));
        $bounces = $sessions->filter(fn (Collection $visits) => $visits->count() === 1 && (int) $visits->sum('duration_seconds') < 10)->count();

        return [
            'periodDays' => $days,
            'liveVisitors' => $liveSessions->count(),
            'visitors' => $trackedRows->pluck('visitor_id')->filter()->unique()->count(),
            'sessions' => $sessions->count(),
            'pageViews' => $trackedRows->count(),
            'averageDurationSeconds' => $sessionDurations->count() ? (int) round($sessionDurations->average()) : 0,
            'bounceRate' => $sessions->count() ? round(($bounces / $sessions->count()) * 100, 1) : 0,
            'pagesPerSession' => $sessions->count() ? round($trackedRows->count() / $sessions->count(), 2) : 0,
            'topPages' => $this->breakdown($trackedRows, 'path', 'Unknown', 8),
            'countries' => $this->breakdown($sessionEntrances, 'country', 'Unknown', 8),
            'sources' => $this->breakdown($sessionEntrances, 'source', 'Direct', 8),
            'devices' => $this->breakdown($sessionEntrances, 'device_type', 'Unknown', 5),
            'browsers' => $this->breakdown($sessionEntrances, 'browser', 'Unknown', 6),
            'liveSessions' => $liveSessions->take(20)->map(fn ($row) => [
                'sessionId' => $row->session_id,
                'path' => $row->path,
                'country' => $row->country ?: 'Unknown',
                'city' => $row->city ?: '',
                'source' => $row->source ?: 'Direct',
                'deviceType' => $row->device_type ?: 'Unknown',
                'browser' => $row->browser ?: 'Unknown',
                'durationSeconds' => (int) $row->duration_seconds,
                'lastSeenAt' => (string) $row->last_seen_at,
            ])->all(),
        ];
    }

    private function breakdown(Collection $rows, string $field, string $fallback, int $limit): array
    {
        return $rows->groupBy(fn ($row) => trim((string) ($row->{$field} ?? '')) ?: $fallback)
            ->map(fn (Collection $items, string $name) => ['name' => $name, 'count' => $items->count()])
            ->sortByDesc('count')->take($limit)->values()->all();
    }

    private function location(Request $request): array
    {
        $country = $request->header('CF-IPCountry') ?: $request->header('CloudFront-Viewer-Country') ?: $request->header('X-Vercel-IP-Country');
        $city = $request->header('CloudFront-Viewer-City') ?: $request->header('X-Vercel-IP-City');
        $resolved = (!$country || !$city) ? $this->geolocation->locate($request->ip()) : ['country' => null, 'city' => null];

        return [
            'country' => $country ? Str::limit(urldecode((string) $country), 80, '') : $resolved['country'],
            'city' => $city ? Str::limit(urldecode((string) $city), 80, '') : $resolved['city'],
        ];
    }

    private function source(string $referrer): array
    {
        if ($referrer === '') return ['name' => 'Direct', 'type' => 'direct'];
        $host = strtolower((string) parse_url($referrer, PHP_URL_HOST));
        $siteHost = strtolower((string) parse_url(config('app.url'), PHP_URL_HOST));
        if ($host === '' || $host === $siteHost) return ['name' => 'Direct', 'type' => 'direct'];

        $known = [
            'google.' => ['Google', 'search'], 'bing.com' => ['Bing', 'search'], 'yahoo.' => ['Yahoo', 'search'],
            'facebook.com' => ['Facebook', 'social'], 'instagram.com' => ['Instagram', 'social'],
            'linkedin.com' => ['LinkedIn', 'social'], 'tiktok.com' => ['TikTok', 'social'],
            'twitter.com' => ['X / Twitter', 'social'], 'x.com' => ['X / Twitter', 'social'],
            'youtube.com' => ['YouTube', 'social'], 'whatsapp.com' => ['WhatsApp', 'social'],
        ];
        foreach ($known as $needle => [$name, $type]) {
            if (str_contains($host, $needle)) return ['name' => $name, 'type' => $type];
        }
        return ['name' => preg_replace('/^www\./', '', $host), 'type' => 'referral'];
    }

    private function device(string $ua): string
    {
        if (preg_match('/bot|crawl|spider|slurp/i', $ua)) return 'bot';
        if (preg_match('/iPad|Tablet|Android(?!.*Mobile)/i', $ua)) return 'tablet';
        return preg_match('/Mobile|Android|iPhone/i', $ua) ? 'mobile' : 'desktop';
    }

    private function browser(string $ua): string
    {
        return match (true) {
            preg_match('/Edg\//i', $ua) === 1 => 'Edge', preg_match('/OPR\//i', $ua) === 1 => 'Opera',
            preg_match('/Chrome\//i', $ua) === 1 => 'Chrome', preg_match('/Firefox\//i', $ua) === 1 => 'Firefox',
            preg_match('/Safari\//i', $ua) === 1 => 'Safari', default => 'Unknown',
        };
    }

    private function operatingSystem(string $ua): string
    {
        return match (true) {
            preg_match('/Windows/i', $ua) === 1 => 'Windows', preg_match('/iPhone|iPad|iPod/i', $ua) === 1 => 'iOS',
            preg_match('/Android/i', $ua) === 1 => 'Android', preg_match('/Mac OS X|Macintosh/i', $ua) === 1 => 'macOS',
            preg_match('/Linux/i', $ua) === 1 => 'Linux', default => 'Unknown',
        };
    }
}
