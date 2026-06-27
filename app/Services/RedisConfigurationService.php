<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

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

        $started = microtime(true);

        try {
            $info = $this->socketTest(
                (string) $settings['host'],
                (int) $settings['port'],
                blank($settings['username'] ?? '') ? null : (string) $settings['username'],
                $password,
                (int) $settings['database'],
            );

            return [
                'connected' => true,
                'message' => 'Redis connection successful.',
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

    private function socketTest(string $host, int $port, ?string $username, ?string $password, int $database): mixed
    {
        $errorCode = 0;
        $errorMessage = '';
        $socket = @stream_socket_client(
            "tcp://{$host}:{$port}",
            $errorCode,
            $errorMessage,
            3,
            STREAM_CLIENT_CONNECT
        );

        if (! is_resource($socket)) {
            throw new \RuntimeException($errorMessage ?: "Unable to connect to Redis at {$host}:{$port}.");
        }

        stream_set_timeout($socket, 3);

        try {
            if (filled($password)) {
                $auth = filled($username)
                    ? $this->redisCommand($socket, 'AUTH', [$username, $password])
                    : $this->redisCommand($socket, 'AUTH', [$password]);

                if (! $this->redisOk($auth)) {
                    throw new \RuntimeException('Redis authentication failed: '.$this->redisMessage($auth));
                }
            }

            $select = $this->redisCommand($socket, 'SELECT', [(string) $database]);
            if (! $this->redisOk($select)) {
                throw new \RuntimeException('Redis database selection failed: '.$this->redisMessage($select));
            }

            $pong = $this->redisCommand($socket, 'PING');
            if (! $this->redisOk($pong, 'PONG')) {
                throw new \RuntimeException('Redis ping failed: '.$this->redisMessage($pong));
            }

            try {
                return $this->redisCommand($socket, 'INFO', ['memory']);
            } catch (\Throwable) {
                return null;
            }
        } finally {
            fclose($socket);
        }
    }

    private function redisCommand($socket, string $command, array $arguments = []): mixed
    {
        $parts = array_merge([$command], $arguments);
        $payload = '*'.count($parts)."\r\n";

        foreach ($parts as $part) {
            $part = (string) $part;
            $payload .= '$'.strlen($part)."\r\n{$part}\r\n";
        }

        fwrite($socket, $payload);

        return $this->redisRead($socket);
    }

    private function redisRead($socket): mixed
    {
        $line = fgets($socket);
        if ($line === false) {
            throw new \RuntimeException('Redis did not return a response.');
        }

        $type = $line[0];
        $value = rtrim(substr($line, 1), "\r\n");

        return match ($type) {
            '+' => ['type' => 'status', 'value' => $value],
            '-' => ['type' => 'error', 'value' => $value],
            ':' => ['type' => 'integer', 'value' => (int) $value],
            '$' => $this->redisBulkString($socket, (int) $value),
            '*' => $this->redisArray($socket, (int) $value),
            default => ['type' => 'unknown', 'value' => trim($line)],
        };
    }

    private function redisBulkString($socket, int $length): mixed
    {
        if ($length < 0) {
            return null;
        }

        $value = '';
        while (strlen($value) < $length) {
            $chunk = fread($socket, $length - strlen($value));
            if ($chunk === false || $chunk === '') {
                throw new \RuntimeException('Redis bulk response ended early.');
            }
            $value .= $chunk;
        }
        fread($socket, 2);

        return $value;
    }

    private function redisArray($socket, int $count): array
    {
        $items = [];
        for ($index = 0; $index < $count; $index++) {
            $items[] = $this->redisRead($socket);
        }

        return $items;
    }

    private function redisOk(mixed $response, string $expected = 'OK'): bool
    {
        if (is_array($response) && ($response['type'] ?? '') === 'status') {
            return strtoupper((string) $response['value']) === $expected;
        }

        if (is_string($response)) {
            return strtoupper($response) === $expected;
        }

        return false;
    }

    private function redisMessage(mixed $response): string
    {
        if (is_array($response) && array_key_exists('value', $response)) {
            return (string) $response['value'];
        }

        if (is_string($response)) {
            return $response;
        }

        return 'Unexpected Redis response.';
    }
}
