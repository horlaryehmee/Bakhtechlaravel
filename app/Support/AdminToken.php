<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminToken
{
    public static function make(object $admin): string
    {
        $expires = now()->addDays(7)->timestamp;
        $payload = $admin->id . '|' . $expires . '|' . Str::random(32);
        $signature = hash_hmac('sha256', $payload, self::secret());

        return rtrim(strtr(base64_encode($payload . '|' . $signature), '+/', '-_'), '=');
    }

    public static function admin(string $token): ?object
    {
        $decoded = base64_decode(strtr($token, '-_', '+/'), true);
        if (!$decoded) {
            return null;
        }

        $parts = explode('|', $decoded);
        if (count($parts) !== 4) {
            return null;
        }

        [$adminId, $expires, $random, $signature] = $parts;
        $payload = $adminId . '|' . $expires . '|' . $random;
        $expected = hash_hmac('sha256', $payload, self::secret());

        if (!hash_equals($expected, $signature) || ((int) $expires) < now()->timestamp) {
            return null;
        }

        return DB::table('admins')
            ->select('id', 'email', 'name', 'role', 'created_at')
            ->where('id', $adminId)
            ->first();
    }

    private static function secret(): string
    {
        return env('API_TOKEN_SECRET') ?: env('APP_KEY', 'dev-only-change-this-secret');
    }
}
