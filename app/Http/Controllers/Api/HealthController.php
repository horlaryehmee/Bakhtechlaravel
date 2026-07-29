<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SiteIncidentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function health(): JsonResponse
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

        return response()->json([
            'ok' => true,
            'service' => 'bakhtech-api',
            'database' => 'connected',
        ]);
    }

    public function ready(SiteIncidentService $incidents): JsonResponse
    {
        $checks = collect($incidents->diagnostics());
        $sourceClasses = [
            BakhtechApiController::class,
            BookingCmsController::class,
            InvoiceController::class,
            PricingController::class,
        ];
        $missingClasses = collect($sourceClasses)
            ->reject(fn (string $class): bool => class_exists($class))
            ->values();

        $checks->push([
            'key' => 'source',
            'label' => 'Application source',
            'ok' => $missingClasses->isEmpty(),
            'status' => $missingClasses->isEmpty() ? 'ok' : 'issue',
            'message' => $missingClasses->isEmpty()
                ? 'Required application classes are loadable.'
                : 'Missing application classes: '.$missingClasses->implode(', '),
        ]);

        $required = ['application', 'database', 'storage', 'source'];
        $ok = $checks
            ->filter(fn (array $check): bool => in_array((string) ($check['key'] ?? ''), $required, true))
            ->every(fn (array $check): bool => (bool) ($check['ok'] ?? false));

        return response()->json([
            'ok' => $ok,
            'service' => 'bakhtech-api',
            'release' => $this->releaseId(),
            'requiredChecks' => $required,
            'checks' => $checks->values(),
        ], $ok ? 200 : 503);
    }

    private function releaseId(): string
    {
        $path = storage_path('app/deployment-ref');
        if (! is_readable($path)) {
            return 'unknown';
        }

        $release = trim((string) file_get_contents($path));

        return $release !== '' ? substr($release, 0, 12) : 'unknown';
    }
}
