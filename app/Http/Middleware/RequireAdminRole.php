<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RequireAdminRole
{
    /** @var array<string, int> */
    private array $rank = [
        'viewer' => 1,
        'staff' => 2,
        'manager' => 3,
        'admin' => 4,
    ];

    public function handle(Request $request, Closure $next, string $minimumRole)
    {
        $admin = $request->attributes->get('admin');
        $role = $admin?->role ?? 'admin';

        if (($this->rank[$role] ?? 0) < ($this->rank[$minimumRole] ?? 999)) {
            return response()->json(['message' => 'You do not have permission to perform this action.'], 403);
        }

        return $next($request);
    }
}
