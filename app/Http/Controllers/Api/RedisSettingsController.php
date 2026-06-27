<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\RedisConfigurationService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RedisSettingsController extends Controller
{
    public function __construct(private readonly RedisConfigurationService $redisConfiguration)
    {
    }

    public function show()
    {
        return [
            'settings' => $this->redisConfiguration->settings(),
            'status' => $this->redisConfiguration->test(),
        ];
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'host' => ['required_if:enabled,true', 'nullable', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'database' => ['required', 'integer', 'min:0', 'max:15'],
            'cacheDatabase' => ['required', 'integer', 'min:0', 'max:15'],
            'client' => ['required', Rule::in(['phpredis', 'predis'])],
            'password' => ['nullable', 'string', 'max:1000'],
            'clearPassword' => ['nullable', 'boolean'],
        ]);

        $settings = $this->redisConfiguration->save($data);

        return [
            'settings' => $settings,
            'status' => $this->redisConfiguration->test(),
        ];
    }

    public function test(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['nullable', 'boolean'],
            'host' => ['nullable', 'string', 'max:255'],
            'username' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'database' => ['nullable', 'integer', 'min:0', 'max:15'],
            'cacheDatabase' => ['nullable', 'integer', 'min:0', 'max:15'],
            'client' => ['nullable', Rule::in(['phpredis', 'predis'])],
            'password' => ['nullable', 'string', 'max:1000'],
        ]);

        return ['status' => $this->redisConfiguration->test($data, false)];
    }
}
