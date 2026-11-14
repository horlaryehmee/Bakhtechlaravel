<?php
namespace App\Http\Middleware;

use App\Support\AdminToken;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RequirePortalIdentity
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();
        abort_unless($token, 401, 'Please sign in.');
        if ($request->is('api/client-admin/*')) {
            $admin = AdminToken::resolve($token)['admin'] ?? null;
            abort_unless($admin && in_array($admin->role ?? 'admin', ['admin', 'manager', 'staff']), 403, 'Administrator or assigned staff access required.');
            $request->attributes->set('portal_admin', $admin);
        } else {
            $user = DB::table('portal_sessions')->join('users', 'users.id', '=', 'portal_sessions.user_id')->where('token_hash', hash('sha256', $token))->where('expires_at', '>', now())->where('portal_active', true)->select('users.id', 'users.name', 'users.email', 'users.company', 'users.portal_password_set', 'users.google_subject')->first();
            abort_unless($user, 401, 'Your session has expired. Please sign in again.');
            $user->portal_password_set = (bool) $user->portal_password_set;
            $request->attributes->set('portal_client', $user);
        }
        return $next($request);
    }
}
