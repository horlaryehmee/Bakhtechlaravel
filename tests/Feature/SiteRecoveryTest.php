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

    public function test_failure_summary_explains_common_causes_without_exposing_secrets(): void
    {
        $service = app(SiteRecoveryService::class);
        $this->assertStringContainsString('disk space', $service->failureSummary(new \RuntimeException('No space left on device: /private/secret')));
        $this->assertStringContainsString('background writers', $service->failureSummary(new \RuntimeException('tar: file changed as we read it')));
        $summary = $service->failureSummary(new \RuntimeException('Access denied password=very-secret'));
        $this->assertStringContainsString('credentials', $summary);
        $this->assertStringNotContainsString('very-secret', $summary);
        $this->assertStringNotContainsString('very-secret', $service->failureSummary(new \RuntimeException('Unexpected password=very-secret')));
    }

    public function test_staff_cannot_read_or_run_recovery(): void
    {
        $headers = $this->headersFor('staff');
        $this->getJson('/api/admin/system/recovery', $headers)->assertForbidden();
        $this->postJson('/api/admin/system/recovery', ['action' => 'backup'], $headers)->assertForbidden();
        $this->deleteJson('/api/admin/system/recovery/backup', ['backup' => 'backup-test', 'confirmation' => 'DELETE'], $headers)->assertForbidden();
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

    private function backupFixture(): array
    {
        $root = sys_get_temp_dir().DIRECTORY_SEPARATOR.'bakhtech-delete-test-'.bin2hex(random_bytes(8));
        $id = 'backup-'.\Illuminate\Support\Str::uuid();
        mkdir($root.DIRECTORY_SEPARATOR.$id, 0700, true);
        config(['site_maintenance.directory' => $root]);
        file_put_contents($root.DIRECTORY_SEPARATOR.$id.'/files.tar.gz', 'test archive');
        file_put_contents($root.DIRECTORY_SEPARATOR.$id.'/database.sql', 'test snapshot');
        file_put_contents($root.DIRECTORY_SEPARATOR.$id.'/manifest.json', json_encode(['id' => $id, 'createdAt' => now()->toIso8601String()]));
        $this->beforeApplicationDestroyed(fn () => \Illuminate\Support\Facades\File::deleteDirectory($root));
        return [$root, $id];
    }

    public function test_confirmed_deletion_only_removes_selected_backup(): void
    {
        [$root, $id] = $this->backupFixture();
        file_put_contents($root.'/keep.txt', 'keep');
        $headers = $this->headersFor('admin');
        $this->deleteJson('/api/admin/system/recovery/backup', ['backup' => $id], $headers)->assertUnprocessable();
        $this->assertDirectoryExists($root.DIRECTORY_SEPARATOR.$id);
        $this->deleteJson('/api/admin/system/recovery/backup', ['backup' => $id, 'confirmation' => 'DELETE'], $headers)->assertOk();
        $this->assertDirectoryDoesNotExist($root.DIRECTORY_SEPARATOR.$id);
        $this->assertFileExists($root.'/keep.txt');
    }

    public function test_pending_operations_block_deletion(): void
    {
        [$root, $id] = $this->backupFixture();
        $headers = $this->headersFor('admin');
        foreach (['queued', 'running'] as $status) {
            file_put_contents($root.'/operation.json', json_encode(['status' => $status]));
            $this->deleteJson('/api/admin/system/recovery/backup', ['backup' => $id, 'confirmation' => 'DELETE'], $headers)->assertStatus(409);
            $this->assertFileExists($root.DIRECTORY_SEPARATOR.$id.'/files.tar.gz');
        }
    }

    public function test_unexpected_contents_are_not_recursively_deleted(): void
    {
        [$root, $id] = $this->backupFixture();
        mkdir($root.DIRECTORY_SEPARATOR.$id.'/unexpected');
        $this->deleteJson('/api/admin/system/recovery/backup', ['backup' => $id, 'confirmation' => 'DELETE'], $this->headersFor('admin'))->assertUnprocessable();
        $this->assertFileExists($root.DIRECTORY_SEPARATOR.$id.'/files.tar.gz');
    }
}
