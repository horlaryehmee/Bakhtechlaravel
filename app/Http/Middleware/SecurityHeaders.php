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
        $response->headers->set('X-Permitted-Cross-Domain-Policies', 'none');
        $response->headers->set('Content-Security-Policy', implode('; ', [
            "default-src 'self'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "img-src 'self' data: https: https://www.googletagmanager.com https://googleads.g.doubleclick.net https://www.google.com https://google.com https://pagead2.googlesyndication.com https://www.googleadservices.com",
            "media-src 'self' data: https:",
            "font-src 'self' data: https:",
            "style-src 'self' 'unsafe-inline' https:",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
            "script-src-elem 'self' 'unsafe-inline' https: https://www.googleadservices.com https://www.google.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net",
            "connect-src 'self' https: wss: https://pagead2.googlesyndication.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://ad.doubleclick.net https://www.google.com https://google.com",
            "frame-src 'self' https://www.googletagmanager.com https://www.youtube.com https://www.youtube-nocookie.com",
        ]));

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        if ($isAdminOrAuth) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        }

        if ($path === 'api/health' || $path === 'api/ready' || $path === 'up') {
            $response->headers->set('Cache-Control', 'no-store, max-age=0');
        }

        if ($request->is('api/projects') || $request->is('api/settings') || $request->is('api/pages/*') || $request->is('api/pricing')) {
            $response->headers->set('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
        }

        if ($request->is('assets/*') || str_starts_with($path, 'assets/')) {
            $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
        }

        header_remove('X-Powered-By');

        return $response;
    }
}
