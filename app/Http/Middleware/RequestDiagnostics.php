<?php

namespace App\Http\Middleware;

use App\Services\SiteIncidentService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class RequestDiagnostics
{
    public function handle(Request $request, Closure $next)
    {
        $requestId = (string) ($request->headers->get('X-Request-Id') ?: Str::uuid());
        $request->headers->set('X-Request-Id', $requestId);
        $started = microtime(true);

        $response = $next($request);
        $durationMs = (int) round((microtime(true) - $started) * 1000);
        $response->headers->set('X-Request-Id', $requestId);

        if ($durationMs >= (int) config('services.monitoring.slow_request_ms', 5000)) {
            Log::warning('Slow request detected.', [
                'requestId' => $requestId,
                'method' => $request->method(),
                'path' => $request->path(),
                'status' => $response->getStatusCode(),
                'durationMs' => $durationMs,
                'ip' => $request->ip(),
            ]);

            app(SiteIncidentService::class)->report([
                'severity' => 'warning',
                'type' => 'slow_request',
                'source' => 'request-diagnostics',
                'message' => "Slow request: {$request->method()} /{$request->path()} took {$durationMs}ms",
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'context' => [
                    'requestId' => $requestId,
                    'status' => $response->getStatusCode(),
                    'durationMs' => $durationMs,
                    'ip' => $request->ip(),
                    'userAgent' => $request->userAgent(),
                ],
            ]);
        }

        return $response;
    }
}
