<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class VisitorAnalyticsService
{
    public function __construct(private readonly IpGeolocationService $geolocation) {}

    public function track(Request $request, array $data): void
    {
        $sessionId = (string) ($data['sessionId'] ?? '');
        $path = Str::limit((string) ($data['path'] ?? '/'), 500, '');
        $now = now();

        if (! $this->analyticsSchemaReady()) {
            if (($data['eventType'] ?? 'pageview') === 'pageview') {
                DB::table('visits')->insert([
                    'path' => $path,
                    'referrer' => Str::limit((string) ($data['referrer'] ?? ''), 2000, ''),
                    'user_agent' => Str::limit((string) $request->userAgent(), 2000, ''),
                    'ip' => (string) $request->ip(),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            return;
        }

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
        $source = $this->source((string) ($data['referrer'] ?? ''), $path, $userAgent, (string) ($data['sourceHint'] ?? ''));

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

        if (! $this->analyticsSchemaReady()) {
            return $this->legacyDashboard($range, $periodLabel, $start, $end);
        }

        $trackedVisits = $this->trackedVisits($start, $end);
        $totals = (clone $trackedVisits)
            ->selectRaw('COUNT(*) as page_views')
            ->selectRaw("COUNT(DISTINCT CASE WHEN visitor_id IS NOT NULL AND visitor_id != '' THEN visitor_id END) as visitors")
            ->first();
        $sessionRollups = (clone $trackedVisits)
            ->select('session_id')
            ->selectRaw('COUNT(*) as page_views')
            ->selectRaw('SUM(COALESCE(duration_seconds, 0)) as total_duration')
            ->groupBy('session_id');
        $sessionSummary = DB::query()
            ->fromSub($sessionRollups, 'session_rollups')
            ->selectRaw('COUNT(*) as sessions')
            ->selectRaw('COALESCE(AVG(total_duration), 0) as average_duration')
            ->selectRaw('COALESCE(SUM(CASE WHEN page_views = 1 AND total_duration < 10 THEN 1 ELSE 0 END), 0) as bounces')
            ->first();
        $pageViews = (int) ($totals->page_views ?? 0);
        $sessions = (int) ($sessionSummary->sessions ?? 0);
        $bounces = (int) ($sessionSummary->bounces ?? 0);

        $liveSessions = DB::table('visits')
            ->select([
                'session_id', 'path', 'country', 'city', 'source', 'device_type',
                'browser', 'duration_seconds', 'last_seen_at',
            ])
            ->where('last_seen_at', '>=', now()->subMinutes(2))
            ->whereNotNull('session_id')
            ->where('session_id', '!=', '')
            ->where(function ($query) {
                $query->whereNull('device_type')->orWhere('device_type', '!=', 'bot');
            })
            ->orderByDesc('last_seen_at')
            ->limit(200)
            ->get()
            ->unique('session_id')
            ->take(20)
            ->values();

        return [
            'range' => $range,
            'periodLabel' => $periodLabel,
            'startDate' => $start->toDateString(),
            'endDate' => $end->toDateString(),
            'visitorTotals' => $this->visitorTotals(),
            'liveVisitors' => $liveSessions->count(),
            'visitors' => (int) ($totals->visitors ?? 0),
            'sessions' => $sessions,
            'pageViews' => $pageViews,
            'excludedBotPageViews' => DB::table('visits')
                ->whereBetween('created_at', [$start, $end])
                ->where('device_type', 'bot')
                ->count(),
            'averageDurationSeconds' => $sessions ? (int) round((float) $sessionSummary->average_duration) : 0,
            'bounceRate' => $sessions ? round(($bounces / $sessions) * 100, 1) : 0,
            'pagesPerSession' => $sessions ? round($pageViews / $sessions, 2) : 0,
            'topPages' => $this->queryBreakdown($trackedVisits, 'path', 'Unknown', 8),
            'countries' => $this->queryBreakdown($trackedVisits, 'country', 'Unknown', 8, true),
            'sources' => $this->queryBreakdown($trackedVisits, 'source', 'Direct', 8, true),
            'devices' => $this->queryBreakdown($trackedVisits, 'device_type', 'Unknown', 5, true),
            'browsers' => $this->queryBreakdown($trackedVisits, 'browser', 'Unknown', 6, true),
            'trendInterval' => $start->diffInDays($end) > 90 ? 'month' : 'day',
            'trend' => $this->visitorTrend($trackedVisits, $start, $end),
            'liveSessions' => $liveSessions->map(fn ($row) => [
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

    public function backfillKnownSources(int $limit = 250): int
    {
        if (! $this->analyticsSchemaReady()) {
            return 0;
        }

        return DB::table('visits')->where(function ($query) {
            $query->whereNull('source')->orWhere('source', '')->orWhere('source', 'Direct');
        })->where(function ($query) {
            $query->whereNotNull('referrer')->where('referrer', '!=', '')
                ->orWhere('user_agent', 'like', '%Instagram%')
                ->orWhere('user_agent', 'like', '%FBAN%')
                ->orWhere('user_agent', 'like', '%FBAV%')
                ->orWhere('user_agent', 'like', '%TikTok%')
                ->orWhere('user_agent', 'like', '%WhatsApp%')
                ->orWhere('user_agent', 'like', '%GSA/%')
                ->orWhere('path', 'like', '%utm_source=%')
                ->orWhere('path', 'like', '%gclid=%')
                ->orWhere('path', 'like', '%fbclid=%')
                ->orWhere('path', 'like', '%ttclid=%');
        })->orderByDesc('id')
            ->limit(max(1, min($limit, 1000)))
            ->get()
            ->sum(function ($visit): int {
                $source = $this->source((string) $visit->referrer, (string) $visit->path, (string) $visit->user_agent);

                if ($source['name'] === 'Direct') {
                    return 0;
                }

                return DB::table('visits')->where('id', $visit->id)->update([
                    'source' => $source['name'],
                    'source_type' => $source['type'],
                ]);
            });
    }

    private function analyticsSchemaReady(): bool
    {
        return Schema::hasTable('visits') && Schema::hasColumns('visits', [
            'visitor_id', 'session_id', 'source', 'country', 'device_type', 'duration_seconds', 'last_seen_at',
        ]);
    }

    private function legacyDashboard(string $range, string $periodLabel, Carbon $start, Carbon $end): array
    {
        $rows = Schema::hasTable('visits')
            ? DB::table('visits')->whereBetween('created_at', [$start, $end])->orderByDesc('created_at')->get()
            : collect();
        $visitors = $rows->pluck('ip')->filter()->unique()->count();

        return [
            'range' => $range,
            'periodLabel' => $periodLabel,
            'startDate' => $start->toDateString(),
            'endDate' => $end->toDateString(),
            'visitorTotals' => ['week' => 0, 'month' => 0, 'year' => 0],
            'liveVisitors' => 0,
            'visitors' => $visitors,
            'sessions' => $visitors,
            'pageViews' => $rows->count(),
            'excludedBotPageViews' => 0,
            'averageDurationSeconds' => 0,
            'bounceRate' => 0,
            'pagesPerSession' => $visitors ? round($rows->count() / $visitors, 2) : 0,
            'topPages' => $this->breakdown($rows, 'path', 'Unknown', 8),
            'countries' => [],
            'sources' => [],
            'devices' => [],
            'browsers' => [],
            'trendInterval' => $start->diffInDays($end) > 90 ? 'month' : 'day',
            'trend' => [],
            'liveSessions' => [],
            'migrationRequired' => true,
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

    private function trackedVisits(Carbon $start, Carbon $end): Builder
    {
        return DB::table('visits')
            ->whereBetween('created_at', [$start, $end])
            ->whereNotNull('session_id')
            ->where('session_id', '!=', '')
            ->where(function ($query) {
                $query->whereNull('device_type')->orWhere('device_type', '!=', 'bot');
            });
    }

    private function visitorTotals(): array
    {
        $week = now()->subDays(6)->startOfDay();
        $month = now()->subDays(29)->startOfDay();
        $year = now()->subDays(364)->startOfDay();
        $totals = DB::table('visits')
            ->where('created_at', '>=', $year)
            ->whereNotNull('visitor_id')
            ->where('visitor_id', '!=', '')
            ->where(function ($query) {
                $query->whereNull('device_type')->orWhere('device_type', '!=', 'bot');
            })
            ->selectRaw('COUNT(DISTINCT CASE WHEN created_at >= ? THEN visitor_id END) as week', [$week])
            ->selectRaw('COUNT(DISTINCT CASE WHEN created_at >= ? THEN visitor_id END) as month', [$month])
            ->selectRaw('COUNT(DISTINCT visitor_id) as year')
            ->first();

        return [
            'week' => (int) ($totals->week ?? 0),
            'month' => (int) ($totals->month ?? 0),
            'year' => (int) ($totals->year ?? 0),
        ];
    }

    private function visitorTrend(Builder $query, Carbon $start, Carbon $end): array
    {
        $monthly = $start->diffInDays($end) > 90;
        $driver = DB::connection()->getDriverName();
        $bucketExpression = match (true) {
            $monthly && $driver === 'mysql' => "DATE_FORMAT(created_at, '%Y-%m')",
            $monthly && $driver === 'pgsql' => "TO_CHAR(created_at, 'YYYY-MM')",
            $monthly => "strftime('%Y-%m', created_at)",
            $driver === 'pgsql' => "TO_CHAR(created_at, 'YYYY-MM-DD')",
            default => 'DATE(created_at)',
        };
        $grouped = (clone $query)
            ->selectRaw("{$bucketExpression} as bucket")
            ->selectRaw('COUNT(*) as page_views')
            ->selectRaw("COUNT(DISTINCT CASE WHEN visitor_id IS NOT NULL AND visitor_id != '' THEN visitor_id END) as visitors")
            ->groupBy(DB::raw($bucketExpression))
            ->get()
            ->keyBy('bucket');
        $cursor = $start->copy();
        $trend = [];

        while ($cursor->lessThanOrEqualTo($end)) {
            $key = $cursor->format($monthly ? 'Y-m' : 'Y-m-d');
            $bucket = $grouped->get($key);
            $trend[] = [
                'date' => $key,
                'label' => $cursor->format($monthly ? 'M Y' : 'M j'),
                'visitors' => (int) ($bucket->visitors ?? 0),
                'pageViews' => (int) ($bucket->page_views ?? 0),
            ];
            $cursor = $monthly ? $cursor->addMonth()->startOfMonth() : $cursor->addDay();
        }

        return $trend;
    }

    private function queryBreakdown(
        Builder $query,
        string $field,
        string $fallback,
        int $limit,
        bool $distinctSessions = false,
    ): array {
        $count = $distinctSessions ? 'COUNT(DISTINCT session_id)' : 'COUNT(*)';

        return (clone $query)
            ->select($field)
            ->selectRaw("{$count} as aggregate")
            ->groupBy($field)
            ->orderByDesc('aggregate')
            ->limit($limit * 2)
            ->get()
            ->map(fn ($row) => [
                'name' => trim((string) ($row->{$field} ?? '')) ?: $fallback,
                'count' => (int) $row->aggregate,
            ])
            ->groupBy('name')
            ->map(fn (Collection $items, string $name) => [
                'name' => $name,
                'count' => $items->sum('count'),
            ])
            ->sortByDesc('count')
            ->take($limit)
            ->values()
            ->all();
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
        $resolved = (! $country || ! $city) ? $this->geolocation->locate($request->ip()) : ['country' => null, 'city' => null];

        return [
            'country' => $country ? Str::limit(urldecode((string) $country), 80, '') : $resolved['country'],
            'city' => $city ? Str::limit(urldecode((string) $city), 80, '') : $resolved['city'],
        ];
    }

    private function source(string $referrer, string $path, string $userAgent, string $sourceHint = ''): array
    {
        parse_str((string) parse_url($path, PHP_URL_QUERY), $query);
        $campaignSource = strtolower(trim((string) ($query['utm_source'] ?? $query['source'] ?? '')));
        if ($campaignSource !== '') {
            $campaigns = [
                'ig' => 'Instagram', 'instagram' => 'Instagram', 'fb' => 'Facebook', 'facebook' => 'Facebook',
                'tiktok' => 'TikTok', 'linkedin' => 'LinkedIn', 'whatsapp' => 'WhatsApp',
                'twitter' => 'X / Twitter', 'x' => 'X / Twitter', 'youtube' => 'YouTube',
            ];

            return ['name' => $campaigns[$campaignSource] ?? Str::headline($campaignSource), 'type' => 'campaign'];
        }

        if (isset($query['gclid']) || isset($query['gbraid']) || isset($query['wbraid'])) {
            return ['name' => 'Google Ads', 'type' => 'campaign'];
        }
        if (isset($query['fbclid'])) {
            return ['name' => 'Meta Ads', 'type' => 'campaign'];
        }
        if (isset($query['ttclid'])) {
            return ['name' => 'TikTok Ads', 'type' => 'campaign'];
        }
        if (isset($query['msclkid'])) {
            return ['name' => 'Microsoft Ads', 'type' => 'campaign'];
        }
        if (isset($query['li_fat_id'])) {
            return ['name' => 'LinkedIn Ads', 'type' => 'campaign'];
        }

        $sourceHint = trim($sourceHint);
        if ($sourceHint !== '') {
            $knownHints = [
                'instagram' => 'Instagram', 'facebook' => 'Facebook', 'google' => 'Google',
                'google ads' => 'Google Ads', 'meta ads' => 'Meta Ads', 'tiktok' => 'TikTok',
                'linkedin' => 'LinkedIn', 'whatsapp' => 'WhatsApp', 'youtube' => 'YouTube',
                'x / twitter' => 'X / Twitter', 'bing' => 'Bing',
            ];
            $normalized = strtolower($sourceHint);
            if (isset($knownHints[$normalized])) {
                $type = str_contains($normalized, 'ads') ? 'campaign' : (in_array($normalized, ['google', 'bing'], true) ? 'search' : 'social');

                return ['name' => $knownHints[$normalized], 'type' => $type];
            }
        }

        if ($referrer === '') {
            return match (true) {
                preg_match('/Instagram/i', $userAgent) === 1 => ['name' => 'Instagram', 'type' => 'social'],
                preg_match('/FBAN|FBAV|\[FB/i', $userAgent) === 1 => ['name' => 'Facebook', 'type' => 'social'],
                preg_match('/TikTok/i', $userAgent) === 1 => ['name' => 'TikTok', 'type' => 'social'],
                preg_match('/WhatsApp/i', $userAgent) === 1 => ['name' => 'WhatsApp', 'type' => 'social'],
                preg_match('/GSA\//i', $userAgent) === 1 => ['name' => 'Google', 'type' => 'search'],
                default => ['name' => 'Direct', 'type' => 'direct'],
            };
        }
        $host = strtolower((string) parse_url($referrer, PHP_URL_HOST));
        $siteHost = strtolower((string) parse_url(config('app.url'), PHP_URL_HOST));
        if ($host === '' || $host === $siteHost) {
            return ['name' => 'Direct', 'type' => 'direct'];
        }

        $known = [
            'google.' => ['Google', 'search'], 'bing.com' => ['Bing', 'search'], 'yahoo.' => ['Yahoo', 'search'],
            'facebook.com' => ['Facebook', 'social'], 'instagram.com' => ['Instagram', 'social'],
            'linkedin.com' => ['LinkedIn', 'social'], 'tiktok.com' => ['TikTok', 'social'],
            'twitter.com' => ['X / Twitter', 'social'], 'x.com' => ['X / Twitter', 'social'],
            'youtube.com' => ['YouTube', 'social'], 'whatsapp.com' => ['WhatsApp', 'social'],
        ];
        foreach ($known as $needle => [$name, $type]) {
            if (str_contains($host, $needle)) {
                return ['name' => $name, 'type' => $type];
            }
        }

        return ['name' => preg_replace('/^www\./', '', $host), 'type' => 'referral'];
    }

    private function device(string $ua): string
    {
        if (preg_match('/bot|crawl|spider|slurp/i', $ua)) {
            return 'bot';
        }
        if (preg_match('/iPad|Tablet|Android(?!.*Mobile)/i', $ua)) {
            return 'tablet';
        }

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
