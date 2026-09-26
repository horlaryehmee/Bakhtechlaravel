<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class LoginRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_other_public_requests_do_not_consume_login_attempts(): void
    {
        for ($i = 0; $i < 10; $i++) {
            RateLimiter::hit(sha1('|127.0.0.1'), 60);
        }

        $this->postJson('/api/auth/login', ['email' => 'unknown@example.test', 'password' => 'incorrect'])
            ->assertUnauthorized();
    }

    public function test_login_aliases_share_the_five_attempt_limit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson($i % 2 ? '/api/auth/login' : '/api/admin/login', ['email' => 'unknown@example.test', 'password' => 'incorrect'])
                ->assertUnauthorized();
        }

        $this->postJson('/api/auth/login', ['email' => 'unknown@example.test', 'password' => 'incorrect'])
            ->assertStatus(429);
    }
}
