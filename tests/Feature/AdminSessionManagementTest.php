<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
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

    public function test_parallel_admin_reads_do_not_contend_on_the_session_row(): void
    {
        DB::table('admins')->insert([
            'name' => 'Read Only Session Admin',
            'email' => 'readonly@example.test',
            'password_hash' => Hash::make('secret-password'),
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $this->postJson('/api/admin/login', [
            'email' => 'readonly@example.test',
            'password' => 'secret-password',
        ])->assertOk()->json('token');

        $session = DB::table('admin_sessions')->first();
        $lastUsedAt = (string) $session->last_used_at;
        $this->travel(10)->minutes();

        $this->withToken($token)->getJson('/api/admin/me')->assertOk();
        $this->withToken($token)->getJson('/api/admin/dashboard')->assertOk();

        $this->assertSame(
            $lastUsedAt,
            (string) DB::table('admin_sessions')->where('id', $session->id)->value('last_used_at'),
        );

        $this->withToken($token)->getJson('/api/admin/sessions')->assertOk();
        $this->assertNotSame(
            $lastUsedAt,
            (string) DB::table('admin_sessions')->where('id', $session->id)->value('last_used_at'),
        );
    }

    public function test_login_uses_a_signed_stateless_token_during_a_partial_session_migration(): void
    {
        DB::table('admins')->insert([
            'name' => 'Legacy Session Admin',
            'email' => 'legacy-session@example.test',
            'password_hash' => Hash::make('secret-password'),
            'role' => 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('admin_sessions', fn ($table) => $table->dropColumn('user_agent'));

        $token = $this->postJson('/api/admin/login', [
            'email' => 'legacy-session@example.test',
            'password' => 'secret-password',
        ])->assertOk()->json('token');

        $this->assertDatabaseCount('admin_sessions', 0);
        $this->withToken($token)
            ->getJson('/api/admin/me')
            ->assertOk()
            ->assertJsonPath('admin.email', 'legacy-session@example.test');
    }
}
