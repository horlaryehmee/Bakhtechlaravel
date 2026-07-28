<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend(\App\Http\Middleware\TrustProductionProxies::class);
        $middleware->append(\Illuminate\Http\Middleware\HandleCors::class);
        $middleware->append(\App\Http\Middleware\RequestDiagnostics::class);
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        $middleware->alias([
            'admin.role' => \App\Http\Middleware\RequireAdminRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        $exceptions->report(function (\Throwable $exception): void {
            try {
                $request = request();
                app(\App\Services\SiteIncidentService::class)->reportThrowable($exception, [
                    'url' => $request->fullUrl(),
                    'path' => $request->path(),
                    'method' => $request->method(),
                    'ip' => $request->ip(),
                    'userAgent' => (string) $request->userAgent(),
                    'environment' => app()->environment(),
                ]);
            } catch (\Throwable) {
                //
            }
        });
    })->create();
