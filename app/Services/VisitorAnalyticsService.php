<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

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

    public function dashboard(string $range = 'month', ?string $startDate = null, ?string $endDate = null): array
    {
        [$start, $end, $periodLabel] = $this->period($range, $startDate, $endDate);
        $rows = DB::table('visits')->whereBetween('created_at', [$start, $end])->orderByDesc('created_at')->get();
        $trackedRows = $rows->filter(fn ($row) => (string) $row->session_id !== '');
        $sessions = $trackedRows->groupBy('session_id');
        $sessionEntrances = $sessions->map(fn (Collection $visits) => $visits->last())->values();
        $liveRows = DB::table('visits')->where('last_seen_at', '>=', now()->subMinutes(2))->orderByDesc('last_seen_at')->limit(200)->get();
        $liveSessions = $liveRows->filter(fn ($row) => (string) $row->session_id !== '')->unique('session_id')->values();
        $sessionDurations = $sessions->map(fn (Collection $visits) => (int) $visits->sum('duration_seconds'));
        $bounces = $sessions->filter(fn (Collection $visits) => $visits->count() === 1 && (int) $visits->sum('duration_seconds') < 10)->count();

        return [
            'range' => $range,
            'periodLabel' => $periodLabel,
            'startDate' => $start->toDateString(),
            'endDate' => $end->toDateString(),
            'visitorTotals' => [
                'week' => $this->uniqueVisitorsSince(now()->subDays(6)->startOfDay()),
                'month' => $this->uniqueVisitorsSince(now()->subDays(29)->startOfDay()),
                'year' => $this->uniqueVisitorsSince(now()->subDays(364)->startOfDay()),
            ],
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
            'trendInterval' => $start->diffInDays($end) > 90 ? 'month' : 'day',
            'trend' => $this->visitorTrend($trackedRows, $start, $end),
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

    private function period(string $range, ?string $startDate, ?string $endDate): array
    {
        $end = now()->endOfDay();

        return match ($range) {
            'week' => [now()->subDays(6)->startOfDay(), $end, 'Last 7 days'],
            'year' => [now()->subMonths(11)->startOfMonth(), $end, 'Last 12 months'],
            'custom' => [
                Carbon::parse((string) $startDate)->startOfDay(),
                Carbon::parse((string) $endDate)->endOfDay(),
                Carbon::parse((string) $startDate)->format('M j, Y').' - '.Carbon::parse((string) $endDate)->format('M j, Y'),
            ],
            default => [now()->subDays(29)->startOfDay(), $end, 'Last 30 days'],
        };
    }

    private function uniqueVisitorsSince(Carbon $start): int
    {
        return DB::table('visits')->where('created_at', '>=', $start)->whereNotNull('visitor_id')->where('visitor_id', '!=', '')->distinct()->count('visitor_id');
    }

    private function visitorTrend(Collection $rows, Carbon $start, Carbon $end): array
    {
        $monthly = $start->diffInDays($end) > 90;
        $grouped = $rows->groupBy(fn ($row) => Carbon::parse($row->created_at)->format($monthly ? 'Y-m' : 'Y-m-d'));
        $cursor = $start->copy();
        $trend = [];

        while ($cursor->lessThanOrEqualTo($end)) {
            $key = $cursor->format($monthly ? 'Y-m' : 'Y-m-d');
            $items = $grouped->get($key, collect());
            $trend[] = [
                'date' => $key,
                'label' => $cursor->format($monthly ? 'M Y' : 'M j'),
                'visitors' => $items->pluck('visitor_id')->filter()->unique()->count(),
                'pageViews' => $items->count(),
            ];
            $cursor = $monthly ? $cursor->addMonth()->startOfMonth() : $cursor->addDay();
        }

        return $trend;
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
