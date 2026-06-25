<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Http\Request;

class AdminToken
{
    public static function make(object $admin, ?Request $request = null): string
    {
        $expires = now()->addDays(7)->timestamp;
        $sessionId = (string) Str::uuid();
        $payload = $admin->id . '|' . $sessionId . '|' . $expires . '|' . Str::random(32);
        $signature = hash_hmac('sha256', $payload, self::secret());
        $token = rtrim(strtr(base64_encode($payload . '|' . $signature), '+/', '-_'), '=');

        if (! Schema::hasTable('admin_sessions')) {
            return $token;
        }

        DB::table('admin_sessions')->insert([
            'admin_id' => $admin->id,
            'session_id' => $sessionId,
            'token_hash' => hash('sha256', $token),
            'device_name' => self::deviceName($request),
            'browser' => self::browser($request?->userAgent() ?? ''),
            'platform' => self::platform($request?->userAgent() ?? ''),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'last_used_at' => now(),
            'expires_at' => now()->setTimestamp($expires),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $token;
    }

    public static function admin(string $token): ?object
    {
        return self::resolve($token)['admin'] ?? null;
    }

    public static function resolve(string $token): ?array
    {
        $decoded = base64_decode(strtr($token, '-_', '+/'), true);
        if (!$decoded) {
            return null;
        }

        $parts = explode('|', $decoded);
        if (count($parts) !== 5) {
            return null;
        }

        [$adminId, $sessionId, $expires, $random, $signature] = $parts;
        $payload = $adminId . '|' . $sessionId . '|' . $expires . '|' . $random;
        $expected = hash_hmac('sha256', $payload, self::secret());

        if (!hash_equals($expected, $signature) || ((int) $expires) < now()->timestamp) {
            return null;
        }

        if (! Schema::hasTable('admin_sessions')) {
            $admin = DB::table('admins')
                ->select('id', 'email', 'name', 'role', 'two_factor_enabled', 'created_at')
                ->where('id', $adminId)
                ->first();

            return $admin ? ['admin' => $admin, 'session' => null] : null;
        }

        $session = DB::table('admin_sessions')
            ->where('session_id', $sessionId)
            ->where('admin_id', $adminId)
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        if (! $session) {
            return null;
        }

        DB::table('admin_sessions')->where('id', $session->id)->update([
            'last_used_at' => now(),
            'updated_at' => now(),
        ]);

        $admin = DB::table('admins')
            ->select('id', 'email', 'name', 'role', 'two_factor_enabled', 'created_at')
            ->where('id', $adminId)
            ->first();

        return $admin ? ['admin' => $admin, 'session' => $session] : null;
    }

    private static function secret(): string
    {
        $secret = (string) config('security.admin_token_secret');

        return $secret !== '' ? $secret : (string) config('app.key');
    }

    private static function deviceName(?Request $request): string
    {
        $userAgent = $request?->userAgent() ?? '';
        $browser = self::browser($userAgent);
        $platform = self::platform($userAgent);

        return trim($browser . ($platform ? ' on ' . $platform : '')) ?: 'Unknown device';
    }

    private static function browser(string $userAgent): string
    {
        return match (true) {
            str_contains($userAgent, 'Edg/') => 'Microsoft Edge',
            str_contains($userAgent, 'OPR/') || str_contains($userAgent, 'Opera') => 'Opera',
            str_contains($userAgent, 'Chrome/') => 'Chrome',
            str_contains($userAgent, 'Firefox/') => 'Firefox',
            str_contains($userAgent, 'Safari/') => 'Safari',
            default => 'Unknown browser',
        };
    }

    private static function platform(string $userAgent): string
    {
        return match (true) {
            str_contains($userAgent, 'Windows') => 'Windows',
            str_contains($userAgent, 'Mac OS X') => 'macOS',
            str_contains($userAgent, 'Android') => 'Android',
            str_contains($userAgent, 'iPhone') || str_contains($userAgent, 'iPad') => 'iOS',
            str_contains($userAgent, 'Linux') => 'Linux',
            default => '',
        };
    }
}
