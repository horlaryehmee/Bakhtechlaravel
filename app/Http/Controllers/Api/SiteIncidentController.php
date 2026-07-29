<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SiteIncidentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class SiteIncidentController extends Controller
{
    public function index(Request $request, SiteIncidentService $incidents)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['open', 'resolved'])],
            'severity' => ['nullable', 'string', 'max:24'],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $page = (int) ($data['page'] ?? 1);
        $perPage = (int) ($data['perPage'] ?? 25);

        if (! Schema::hasTable('site_incidents')) {
            return [
                'incidents' => [],
                'summary' => ['open' => 0, 'resolved' => 0, 'critical' => 0, 'total' => 0],
                'checks' => $incidents->diagnostics(),
                'meta' => ['page' => $page, 'perPage' => $perPage, 'total' => 0, 'lastPage' => 1],
            ];
        }

        $checks = $incidents->diagnostics();
        $this->autoResolveRecoveredIncidents($checks);

        $query = $this->incidentQuery($data);

        $total = (clone $query)->count();
        $rows = $query->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
            ->orderByDesc('last_seen_at')
            ->forPage($page, $perPage)
            ->get();

        return [
            'incidents' => $rows->map(fn ($row) => $this->shape($row, false)),
            'summary' => [
                'open' => DB::table('site_incidents')->where('status', 'open')->count(),
                'resolved' => DB::table('site_incidents')->where('status', 'resolved')->count(),
                'critical' => DB::table('site_incidents')->where('status', 'open')->where('severity', 'critical')->count(),
                'total' => DB::table('site_incidents')->count(),
            ],
            'checks' => $checks,
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'lastPage' => max(1, (int) ceil($total / $perPage)),
            ],
        ];
    }

    public function show(int $id)
    {
        $row = DB::table('site_incidents')->where('id', $id)->first();

        if (! $row) {
            return response()->json(['message' => 'Incident not found.'], 404);
        }

        return ['incident' => $this->shape($row, true)];
    }

    public function export(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['open', 'resolved'])],
            'severity' => ['nullable', 'string', 'max:24'],
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $filename = 'bakhtech-site-incidents-'.now()->format('Y-m-d-His').'.txt';

        if (! Schema::hasTable('site_incidents')) {
            return response("Bakhtech Site Incident Export\nGenerated: ".now()->toIso8601String()."\n\nNo incident table was found.\n", 200, [
                'Content-Type' => 'text/plain; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]);
        }

        $query = $this->incidentQuery($data);
        $rows = $query->orderByRaw("CASE WHEN status = 'open' THEN 0 ELSE 1 END")
            ->orderByDesc('last_seen_at')
            ->get();

        $lines = [
            'Bakhtech Site Incident Export',
            'Generated: '.now()->toIso8601String(),
            'Total incidents: '.$rows->count(),
            '',
            'Filters:',
            '- Status: '.($data['status'] ?? 'all'),
            '- Severity: '.($data['severity'] ?? 'all'),
            '- Search: '.($data['search'] ?? 'none'),
            '',
        ];

        foreach ($rows as $index => $row) {
            $incident = $this->shape($row, true);
            $lines = array_merge($lines, [
                str_repeat('=', 80),
                'Incident #'.($index + 1).' (ID '.$incident['id'].')',
                str_repeat('=', 80),
                'Severity: '.$incident['severity'],
                'Type: '.$incident['type'],
                'Status: '.$incident['status'],
                'Occurrences: '.$incident['occurrenceCount'],
                'Source: '.$incident['source'],
                'Message: '.$incident['message'],
                'URL: '.($incident['url'] ?: 'N/A'),
                'Method: '.($incident['method'] ?: 'N/A'),
                'File: '.($incident['file'] ?: 'N/A').($incident['line'] ? ':'.$incident['line'] : ''),
                'First seen: '.($incident['firstSeenAt'] ?: 'N/A'),
                'Last seen: '.($incident['lastSeenAt'] ?: 'N/A'),
                'Last alert: '.($incident['lastNotifiedAt'] ?: 'N/A'),
                'Resolved at: '.($incident['resolvedAt'] ?: 'N/A'),
                '',
                'Context:',
                json_encode($incident['context'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: '{}',
                '',
                'Trace:',
                $incident['trace'] ?: 'No trace available.',
                '',
            ]);
        }

        return response(implode("\n", $lines), 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function resolve(int $id)
    {
        DB::table('site_incidents')->where('id', $id)->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->show($id);
    }

    public function destroy(int $id)
    {
        $deleted = Schema::hasTable('site_incidents')
            ? DB::table('site_incidents')->where('id', $id)->delete()
            : 0;

        return response()->json(['deleted' => $deleted]);
    }

    public function clear(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['open', 'resolved'])],
        ]);

        if (! Schema::hasTable('site_incidents')) {
            return response()->json(['deleted' => 0]);
        }

        $query = DB::table('site_incidents');
        if (($data['status'] ?? '') !== '') {
            $query->where('status', $data['status']);
        }

        return response()->json(['deleted' => $query->delete()]);
    }

    public function runCheck(SiteIncidentService $incidents)
    {
        $health = $incidents->runHealthCheck();
        $checks = $incidents->diagnostics();

        if (Schema::hasTable('site_incidents')) {
            $this->autoResolveRecoveredIncidents($checks, (bool) ($health['ok'] ?? false));
        }

        return [
            'health' => $health,
            'checks' => $checks,
        ];
    }

    public function clientReport(Request $request, SiteIncidentService $incidents)
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:1000'],
            'method' => ['nullable', 'string', 'max:16'],
            'status' => ['required', 'integer', 'min:400', 'max:599'],
            'message' => ['nullable', 'string', 'max:1000'],
            'body' => ['nullable', 'string', 'max:4000'],
        ]);

        $incidents->report([
            'severity' => $data['status'] >= 500 ? 'error' : 'warning',
            'type' => 'frontend_api_failure',
            'source' => 'admin-frontend',
            'message' => $data['message'] ?: "Admin API request failed with HTTP {$data['status']}",
            'url' => $data['path'],
            'method' => $data['method'] ?? '',
            'context' => [
                'status' => $data['status'],
                'body' => $data['body'] ?? '',
                'browserUrl' => $request->headers->get('referer'),
                'userAgent' => $request->userAgent(),
                'ip' => $request->ip(),
            ],
        ]);

        return response()->json(['recorded' => true]);
    }

    private function incidentQuery(array $data)
    {
        return DB::table('site_incidents')
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($data['severity'] ?? null, fn ($query, $severity) => $query->where('severity', $severity))
            ->when($data['search'] ?? null, function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('message', 'like', "%{$search}%")
                        ->orWhere('type', 'like', "%{$search}%")
                        ->orWhere('source', 'like', "%{$search}%")
                        ->orWhere('url', 'like', "%{$search}%");
                });
            });
    }

    private function autoResolveRecoveredIncidents(array $checks, ?bool $readyOk = null): int
    {
        $now = now();
        $resolved = 0;
        $checksByKey = collect($checks)->keyBy(fn (array $check): string => (string) ($check['key'] ?? ''));
        $requiredChecksOk = collect(['application', 'database', 'storage'])
            ->every(fn (string $key): bool => (bool) ($checksByKey->get($key)['ok'] ?? false));
        $sourceOk = class_exists(BakhtechApiController::class)
            && class_exists(HealthController::class)
            && class_exists(BookingCmsController::class)
            && class_exists(InvoiceController::class)
            && class_exists(PricingController::class);

        if ($sourceOk) {
            $resolved += DB::table('site_incidents')
                ->where('status', 'open')
                ->whereIn('type', ['BindingResolutionException', 'ReflectionException'])
                ->where(function ($query) {
                    $query->where('message', 'like', '%BakhtechApiController%')
                        ->orWhere('message', 'like', '%HealthController%')
                        ->orWhere('message', 'like', '%BookingCmsController%')
                        ->orWhere('message', 'like', '%InvoiceController%')
                        ->orWhere('message', 'like', '%PricingController%');
                })
                ->update([
                    'status' => 'resolved',
                    'resolved_at' => $now,
                    'updated_at' => $now,
                ]);
        }

        if (($readyOk === true) || ($requiredChecksOk && $sourceOk)) {
            $resolved += DB::table('site_incidents')
                ->where('status', 'open')
                ->whereIn('type', ['health_check_http_failure', 'health_check_unreachable'])
                ->update([
                    'status' => 'resolved',
                    'resolved_at' => $now,
                    'updated_at' => $now,
                ]);

            $frontendAutoResolveMinutes = max(1, (int) config('services.monitoring.auto_resolve_frontend_minutes', 10));
            $resolved += DB::table('site_incidents')
                ->where('status', 'open')
                ->where('type', 'frontend_api_failure')
                ->where('source', 'admin-frontend')
                ->where('last_seen_at', '<=', $now->copy()->subMinutes($frontendAutoResolveMinutes))
                ->update([
                    'status' => 'resolved',
                    'resolved_at' => $now,
                    'updated_at' => $now,
                ]);
        }

        if ((bool) ($checksByKey->get('mail')['ok'] ?? false)) {
            $resolved += DB::table('site_incidents')
                ->where('status', 'open')
                ->where('type', 'TransportException')
                ->update([
                    'status' => 'resolved',
                    'resolved_at' => $now,
                    'updated_at' => $now,
                ]);
        }

        $slowAutoResolveMinutes = max(1, (int) config('services.monitoring.auto_resolve_slow_minutes', 60));
        $resolved += DB::table('site_incidents')
            ->where('status', 'open')
            ->where('type', 'slow_request')
            ->where('last_seen_at', '<=', $now->copy()->subMinutes($slowAutoResolveMinutes))
            ->update([
                'status' => 'resolved',
                'resolved_at' => $now,
                'updated_at' => $now,
            ]);

        return $resolved;
    }

    private function shape(object $row, bool $includeDetails): array
    {
        return [
            'id' => (int) $row->id,
            'severity' => (string) $row->severity,
            'type' => (string) $row->type,
            'source' => (string) $row->source,
            'message' => (string) $row->message,
            'url' => (string) $row->url,
            'method' => (string) $row->method,
            'file' => (string) $row->file,
            'line' => $row->line ? (int) $row->line : null,
            'status' => (string) $row->status,
            'occurrenceCount' => (int) $row->occurrence_count,
            'firstSeenAt' => (string) $row->first_seen_at,
            'lastSeenAt' => (string) $row->last_seen_at,
            'lastNotifiedAt' => (string) $row->last_notified_at,
            'resolvedAt' => (string) $row->resolved_at,
            'context' => $includeDetails ? (json_decode((string) $row->context, true) ?: []) : [],
            'trace' => $includeDetails ? (string) $row->trace : '',
        ];
    }
}
