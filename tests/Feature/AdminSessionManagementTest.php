<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminSessionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_view_and_revoke_signed_in_devices(): void
    {
        DB::table('admins')->insert([
            'name' => 'Admin User',
            'email' => 'admin@example.test',
            'password_hash' => Hash::make('secret-password'),
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $login = $this->withHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0) Chrome/120.0')
            ->postJson('/api/admin/login', [
                'email' => 'admin@example.test',
                'password' => 'secret-password',
            ])
            ->assertOk()
            ->json();

        $token = $login['token'];

        $sessions = $this->withToken($token)
            ->getJson('/api/admin/sessions')
            ->assertOk()
            ->json('sessions');

        $this->assertCount(1, $sessions);
        $this->assertTrue($sessions[0]['isCurrent']);
        $this->assertSame('Chrome', $sessions[0]['browser']);
        $this->assertSame('Windows', $sessions[0]['platform']);

        $this->withToken($token)
            ->deleteJson('/api/admin/sessions/'.$sessions[0]['id'])
            ->assertNoContent();

        $this->withToken($token)
            ->getJson('/api/admin/me')
            ->assertUnauthorized();
    }
}
