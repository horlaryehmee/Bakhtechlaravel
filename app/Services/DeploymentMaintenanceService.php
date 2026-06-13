<?php

namespace App\Services;

use Illuminate\Support\Facades\Artisan;

class DeploymentMaintenanceService
{
    public function run()
    {
        @set_time_limit(180);

        $lockPath = storage_path('framework/deployment-maintenance.lock');
        $lock = fopen($lockPath, 'c+');

        if (! $lock || ! flock($lock, LOCK_EX | LOCK_NB)) {
            if (is_resource($lock)) {
                fclose($lock);
            }

            return response()->json(['message' => 'A deployment maintenance run is already in progress.'], 409);
        }

        $commands = [
            ['name' => 'migrate', 'parameters' => ['--force' => true, '--no-interaction' => true]],
            ['name' => 'optimize:clear', 'parameters' => ['--no-interaction' => true]],
            ['name' => 'optimize', 'parameters' => ['--no-interaction' => true]],
        ];
        $results = [];

        try {
            foreach ($commands as $command) {
                $startedAt = microtime(true);
                $exitCode = Artisan::call($command['name'], $command['parameters']);
                $results[] = [
                    'command' => 'php artisan '.$command['name'].($command['name'] === 'migrate' ? ' --force' : ''),
                    'exitCode' => $exitCode,
                    'output' => trim(Artisan::output()),
                    'durationMs' => (int) round((microtime(true) - $startedAt) * 1000),
                ];

                if ($exitCode !== 0) {
                    return response()->json([
                        'message' => 'Deployment maintenance stopped because a command failed.',
                        'results' => $results,
                    ], 500);
                }
            }

            return response()->json([
                'message' => 'Database migrations and Laravel optimization completed.',
                'results' => $results,
                'completedAt' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Deployment maintenance failed: '.$exception->getMessage(),
                'results' => $results,
            ], 500);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
