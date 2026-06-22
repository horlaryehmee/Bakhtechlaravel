<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

class IpGeolocationService
{
    public function locate(?string $ip): array
    {
        $empty = ['country' => null, 'city' => null];
        $ip = trim((string) $ip);

        if (!(bool) config('services.ip_geolocation.enabled', true) || !$this->isPublicIp($ip)) {
            return $empty;
        }

        $cacheKey = 'ip-geolocation:' . hash('sha256', $ip);

        if (Cache::has($cacheKey)) {
            return Cache::get($cacheKey, $empty);
        }

        try {
            $template = (string) config('services.ip_geolocation.url', 'https://ipwho.is/{ip}');
            $url = str_replace('{ip}', rawurlencode($ip), $template);
            $response = Http::acceptJson()->connectTimeout(1)->timeout(2)->get($url);

            if (!$response->successful() || $response->json('success') === false) {
                Cache::put($cacheKey, $empty, now()->addHour());
                return $empty;
            }

            $location = [
                'country' => $this->clean($response->json('country') ?? $response->json('country_name')),
                'city' => $this->clean($response->json('city')),
            ];
            Cache::put($cacheKey, $location, now()->addDays(7));

            return $location;
        } catch (Throwable) {
            Cache::put($cacheKey, $empty, now()->addHour());
            return $empty;
        }
    }

    private function isPublicIp(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    private function clean(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : Str::limit($value, 80, '');
    }
}
