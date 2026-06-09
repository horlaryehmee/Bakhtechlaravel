<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        $path = trim($request->path(), '/');
        $isAdminOrAuth = $request->is('api/admin*')
            || $request->is('api/auth*')
            || $request->is('admin*');

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->remove('X-Powered-By');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
        $response->headers->set('Cross-Origin-Resource-Policy', 'same-origin');

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        if ($isAdminOrAuth) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        }

        if ($path === 'api/health' || $path === 'up') {
            $response->headers->set('Cache-Control', 'no-store, max-age=0');
        }

        header_remove('X-Powered-By');

        return $response;
    }
}
