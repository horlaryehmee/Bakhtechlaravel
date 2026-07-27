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

        $query = DB::table('site_incidents')
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
            'checks' => $incidents->diagnostics(),
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

    public function resolve(int $id)
    {
        DB::table('site_incidents')->where('id', $id)->update([
            'status' => 'resolved',
            'resolved_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->show($id);
    }

    public function runCheck(SiteIncidentService $incidents)
    {
        return [
            'health' => $incidents->runHealthCheck(),
            'checks' => $incidents->diagnostics(),
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
