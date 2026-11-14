<?php

namespace Tests\Feature;

use App\Services\SiteRecoveryService;
use App\Support\AdminToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SiteRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private function headersFor(string $role): array
    {
        $id = DB::table('admins')->insertGetId(['name' => $role, 'email' => $role.'@example.com', 'role' => $role, 'password_hash' => Hash::make('test-password')]);
        return ['Authorization' => 'Bearer '.AdminToken::make(DB::table('admins')->find($id))];
    }

    public function test_staff_cannot_read_or_run_recovery(): void
    {
        $headers = $this->headersFor('staff');
        $this->getJson('/api/admin/system/recovery', $headers)->assertForbidden();
        $this->postJson('/api/admin/system/recovery', ['action' => 'backup'], $headers)->assertForbidden();
    }

    public function test_restore_requires_explicit_confirmation(): void
    {
        $this->postJson('/api/admin/system/recovery', ['action' => 'restore', 'backup' => 'backup-test'], $this->headersFor('admin'))->assertUnprocessable()->assertJsonValidationErrors('confirmation');
    }

    public function test_disabled_host_does_not_queue_commands(): void
    {
        config(['site_maintenance.enabled' => false]);
        $this->postJson('/api/admin/system/recovery', ['action' => 'update'], $this->headersFor('admin'))->assertUnprocessable();
    }

    public function test_backup_ids_cannot_escape_private_directory(): void
    {
        $this->expectException(\Symfony\Component\HttpKernel\Exception\HttpException::class);
        app(SiteRecoveryService::class)->validateBackup('../../.env');
    }

    public function test_backup_storage_cannot_be_inside_application(): void
    {
        config(['site_maintenance.directory' => base_path('public')]);
        $this->expectException(\RuntimeException::class);
        app(SiteRecoveryService::class)->directory();
    }
}
