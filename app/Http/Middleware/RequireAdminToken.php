<?php

namespace App\Http\Middleware;

use App\Support\AdminToken;
use Closure;
use Illuminate\Http\Request;

class RequireAdminToken
{
    public function handle(Request $request, Closure $next)
    {
        $header = $request->header('Authorization', '');
        $token = preg_replace('/^Bearer\s+/i', '', $header);
        $session = $token ? AdminToken::resolve($token) : null;
        $admin = $session['admin'] ?? null;

        if (!$admin) {
            return response()->json(['message' => 'Invalid or expired session.'], 401);
        }

        $request->attributes->set('admin', $admin);
        $request->attributes->set('admin_session', $session['session'] ?? null);

        return $next($request);
    }
}
