<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

class RedisConfigurationService
{
    public function settings(): array
    {
        $settings = $this->rawSettings();
        $encryptedPassword = (string) ($settings['redis_password_encrypted'] ?? '');

        return [
            'enabled' => filter_var($settings['redis_enabled'] ?? false, FILTER_VALIDATE_BOOL),
            'host' => (string) ($settings['redis_host'] ?? config('database.redis.default.host', '127.0.0.1')),
            'username' => (string) ($settings['redis_username'] ?? config('database.redis.default.username', '')),
            'port' => (int) ($settings['redis_port'] ?? config('database.redis.default.port', 6379)),
            'database' => (int) ($settings['redis_database'] ?? config('database.redis.default.database', 0)),
            'cacheDatabase' => (int) ($settings['redis_cache_database'] ?? config('database.redis.cache.database', 1)),
            'client' => (string) ($settings['redis_client'] ?? config('database.redis.client', 'phpredis')),
            'password' => '',
            'hasPassword' => filled($encryptedPassword),
        ];
    }

    public function save(array $data): array
    {
        $settings = $this->rawSettings();
        $password = (string) ($settings['redis_password_encrypted'] ?? '');

        if (filled($data['password'] ?? null)) {
            $password = Crypt::encryptString((string) $data['password']);
        } elseif (($data['clearPassword'] ?? false) === true) {
            $password = '';
        }

        $payload = [
            'redis_enabled' => ((bool) $data['enabled']) ? 'true' : 'false',
            'redis_host' => trim((string) $data['host']),
            'redis_username' => trim((string) ($data['username'] ?? '')),
            'redis_port' => (string) ((int) $data['port']),
            'redis_database' => (string) ((int) $data['database']),
            'redis_cache_database' => (string) ((int) $data['cacheDatabase']),
            'redis_client' => (string) ($data['client'] ?? 'phpredis'),
            'redis_password_encrypted' => $password,
        ];

        foreach ($payload as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
            );
        }

        Cache::forget('public:settings');

        return $this->settings();
    }

    public function apply(): void
    {
        $settings = $this->settings();

        if (! $settings['enabled']) {
            return;
        }

        config([
            'cache.default' => 'redis',
            'database.redis.client' => $settings['client'],
            'database.redis.default.host' => $settings['host'],
            'database.redis.default.username' => $settings['username'] ?: null,
            'database.redis.default.password' => $this->password(),
            'database.redis.default.port' => $settings['port'],
            'database.redis.default.database' => $settings['database'],
            'database.redis.cache.host' => $settings['host'],
            'database.redis.cache.username' => $settings['username'] ?: null,
            'database.redis.cache.password' => $this->password(),
            'database.redis.cache.port' => $settings['port'],
            'database.redis.cache.database' => $settings['cacheDatabase'],
        ]);
    }

    public function test(?array $override = null, bool $requireEnabled = true): array
    {
        $settings = $override ? array_merge($this->settings(), $override) : $this->settings();
        $password = filled($override['password'] ?? null)
            ? (string) $override['password']
            : $this->password();

        if ($requireEnabled && ! $settings['enabled']) {
            return [
                'connected' => false,
                'message' => 'Redis is saved but not enabled.',
                'latencyMs' => null,
                'usedMemoryHuman' => null,
            ];
        }

        $connection = 'bakhtech_redis_test';
        config([
            "database.redis.{$connection}" => [
                'url' => null,
                'host' => (string) $settings['host'],
                'username' => blank($settings['username'] ?? '') ? null : (string) $settings['username'],
                'password' => $password ?: null,
                'port' => (int) $settings['port'],
                'database' => (int) $settings['database'],
            ],
        ]);

        $started = microtime(true);

        try {
            $redis = Redis::connection($connection);
            $pong = $redis->ping();
            $info = $redis->command('INFO', ['memory']);
            $redis->disconnect();

            return [
                'connected' => true,
                'message' => is_string($pong) ? $pong : 'Redis connection successful.',
                'latencyMs' => (int) round((microtime(true) - $started) * 1000),
                'usedMemoryHuman' => $this->usedMemoryHuman($info),
            ];
        } catch (\Throwable $exception) {
            return [
                'connected' => false,
                'message' => $exception->getMessage(),
                'latencyMs' => null,
                'usedMemoryHuman' => null,
            ];
        }
    }

    private function rawSettings(): array
    {
        return DB::table('settings')
            ->whereIn('key', [
                'redis_enabled',
                'redis_host',
                'redis_username',
                'redis_port',
                'redis_database',
                'redis_cache_database',
                'redis_client',
                'redis_password_encrypted',
            ])
            ->pluck('value', 'key')
            ->all();
    }

    private function password(): ?string
    {
        $encrypted = (string) ($this->rawSettings()['redis_password_encrypted'] ?? '');
        if (blank($encrypted)) {
            return null;
        }

        try {
            return Crypt::decryptString($encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    private function usedMemoryHuman(mixed $info): ?string
    {
        if (is_string($info) && preg_match('/^used_memory_human:(.+)$/m', $info, $matches)) {
            return trim($matches[1]);
        }

        if (is_array($info) && isset($info['used_memory_human'])) {
            return (string) $info['used_memory_human'];
        }

        return null;
    }
}
