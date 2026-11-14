<?php

namespace App\Services;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

class SiteRecoveryService
{
    public function directory(): string
    {
        $path = config('site_maintenance.directory');
        if (! is_dir($path)) mkdir($path, 0700, true);
        $resolved = realpath($path);
        if (! $resolved || str_starts_with($resolved.DIRECTORY_SEPARATOR, realpath(base_path()).DIRECTORY_SEPARATOR)) {
            throw new \RuntimeException('Backup directory must be outside the application and web root.');
        }
        return $resolved;
    }

    private function write(string $path, array $data): void
    {
        file_put_contents($path.'.tmp', json_encode($data, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT), LOCK_EX);
        chmod($path.'.tmp', 0600);
        rename($path.'.tmp', $path);
    }

    public function status(): array
    {
        $dir = $this->directory();
        $backups = [];
        foreach (glob($dir.'/backup-*/manifest.json') as $file) {
            $manifest = json_decode(file_get_contents($file), true);
            if ($manifest) $backups[] = $manifest;
        }
        usort($backups, fn ($a, $b) => strcmp($b['createdAt'], $a['createdAt']));
        return [
            'enabled' => (bool) config('site_maintenance.enabled') && PHP_OS_FAMILY !== 'Windows',
            'version' => is_file(storage_path('app/deployment-ref')) ? trim(file_get_contents(storage_path('app/deployment-ref'))) : 'Not recorded',
            'operation' => is_file($dir.'/operation.json') ? json_decode(file_get_contents($dir.'/operation.json'), true) : null,
            'backups' => $backups,
        ];
    }

    public function enqueue(string $action, ?string $backup): array
    {
        abort_unless(config('site_maintenance.enabled') && PHP_OS_FAMILY !== 'Windows', 422, 'Enable server maintenance on the Linux host first.');
        $lock = fopen($this->directory().'/operation.lock', 'c+');
        abort_unless(flock($lock, LOCK_EX | LOCK_NB), 409, 'Another operation is running.');
        try {
            $current = $this->status()['operation'];
            abort_if(in_array($current['status'] ?? '', ['queued', 'running']), 409, 'An operation is already queued or running.');
            if ($action === 'restore') $this->validateBackup($backup ?? '');
            $job = ['id' => (string) Str::uuid(), 'action' => $action, 'backup' => $backup, 'status' => 'queued', 'message' => 'Waiting for the server scheduler.', 'createdAt' => now()->toIso8601String()];
            $this->write($this->directory().'/operation.json', $job);
            return $job;
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    public function deleteBackup(string $id): void
    {
        abort_unless(preg_match('/^backup-[a-f0-9-]{36}$/D', $id), 422, 'Invalid backup ID.');
        $root = $this->directory();
        $lock = fopen($root.'/operation.lock', 'c+');
        if (! $lock) throw new \RuntimeException('Cannot acquire operation lock.');
        try {
            abort_unless(flock($lock, LOCK_EX | LOCK_NB), 409, 'An operation is running. Try again when it finishes.');
            $operation = $this->status()['operation'];
            abort_if(in_array($operation['status'] ?? '', ['queued', 'running']), 409, 'Wait for the current operation to finish before deleting backups.');
            $target = $root.DIRECTORY_SEPARATOR.$id;
            abort_unless(! is_link($target) && is_dir($target) && realpath($target) === $target, 404, 'Backup not found.');
            // Never recurse: only remove the known files directly inside this backup.
            $files = array_values(array_diff(scandir($target), ['.', '..']));
            foreach ($files as $file) {
                abort_unless(in_array($file, ['manifest.json', 'files.tar.gz', 'database.sql', 'database.sqlite']) && ! is_link($target.DIRECTORY_SEPARATOR.$file) && is_file($target.DIRECTORY_SEPARATOR.$file), 422, 'Unexpected backup contents; deletion refused.');
            }
            foreach ($files as $file) {
                if (! unlink($target.DIRECTORY_SEPARATOR.$file)) throw new \RuntimeException('Backup could not be fully deleted.');
            }
            if (! rmdir($target)) throw new \RuntimeException('Backup directory could not be removed.');
        } finally { flock($lock, LOCK_UN); fclose($lock); }
    }

    private function run(array $command, ?string $input = null, array $env = []): string
    {
        $process = new Process($command, base_path(), $env, $input, 3600);
        $process->mustRun();
        return $process->getOutput();
    }

    private function mysqlCommand(string $binary): array
    {
        $db = DB::connection()->getConfig();
        $args = [$binary, '--host='.($db['host'] ?? 'localhost'), '--port='.($db['port'] ?? 3306), '--user='.$db['username']];
        if (! empty($db['unix_socket'])) $args[] = '--socket='.$db['unix_socket'];
        return $args;
    }

    private function backup(): string
    {
        $id = 'backup-'.Str::uuid();
        $dir = $this->directory().'/'.$id;
        mkdir($dir, 0700);
        $driver = DB::connection()->getDriverName();
        if ($driver === 'sqlite') {
            DB::connection()->getPdo()->exec('VACUUM INTO '.DB::connection()->getPdo()->quote($dir.'/database.sqlite'));
            $database = 'database.sqlite';
        } elseif ($driver === 'mysql') {
            $database = 'database.sql';
            $args = [...$this->mysqlCommand('mysqldump'), '--single-transaction', '--routines', '--triggers', '--events', '--hex-blob', '--result-file='.$dir.'/'.$database, DB::connection()->getDatabaseName()];
            $this->run($args, null, ['MYSQL_PWD' => (string) DB::connection()->getConfig('password')]);
        } else {
            throw new \RuntimeException('Backups currently support MySQL and SQLite.');
        }
        $this->run(['tar', '-czf', $dir.'/files.tar.gz', '--exclude=./.git', '--exclude=./frontend/node_modules', '--exclude=./node_modules', '--exclude=./storage/framework', '--exclude=./storage/logs', '--exclude=./bootstrap/cache', '-C', base_path(), '.']);
        chmod($dir.'/'.$database, 0600);
        chmod($dir.'/files.tar.gz', 0600);
        $this->write($dir.'/manifest.json', ['id' => $id, 'createdAt' => now()->toIso8601String(), 'driver' => $driver, 'database' => $database, 'version' => $this->status()['version'], 'filesHash' => hash_file('sha256', $dir.'/files.tar.gz'), 'databaseHash' => hash_file('sha256', $dir.'/'.$database), 'bytes' => filesize($dir.'/files.tar.gz') + filesize($dir.'/'.$database)]);
        return $id;
    }

    public function validateBackup(string $id): array
    {
        abort_unless(preg_match('/^backup-[a-f0-9-]{36}$/D', $id), 422, 'Invalid backup ID.');
        $dir = $this->directory().'/'.$id;
        abort_unless(is_file($dir.'/manifest.json'), 404, 'Backup not found.');
        $manifest = json_decode(file_get_contents($dir.'/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
        abort_unless(in_array($manifest['database'] ?? '', ['database.sql', 'database.sqlite']), 422, 'Invalid backup manifest.');
        foreach (['files.tar.gz' => 'filesHash', $manifest['database'] => 'databaseHash'] as $file => $hash) {
            abort_unless(is_file($dir.'/'.$file) && hash_equals($manifest[$hash], hash_file('sha256', $dir.'/'.$file)), 422, 'Backup integrity check failed.');
        }
        return $manifest;
    }

    public function work(): void
    {
        $dir = $this->directory();
        $lock = fopen($dir.'/operation.lock', 'c+');
        if (! flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); return; }
        $maintenance = false;
        $deploymentLock = null;
        try {
            $job = $this->status()['operation'];
            if (($job['status'] ?? '') !== 'queued') return;
            $job['status'] = 'running';
            $job['message'] = 'Creating a full recovery backup.';
            $this->write($dir.'/operation.json', $job);
            if (! config('site_maintenance.enabled') || PHP_OS_FAMILY === 'Windows') throw new \RuntimeException('Maintenance is disabled on this host.');
            if (app()->isDownForMaintenance()) throw new \RuntimeException('The site is already in maintenance mode.');
            $deploymentLock = fopen(storage_path('framework/deployment.lock'), 'c+');
            if (! flock($deploymentLock, LOCK_EX | LOCK_NB)) throw new \RuntimeException('Another deployment or integrity repair is running.');
            if (Artisan::call('down', ['--retry' => 60]) !== 0) throw new \RuntimeException('Cannot enable maintenance mode.');
            $maintenance = true;
            $job['safetyBackup'] = $this->backup();
            $job['message'] = 'Backup complete. Running '.$job['action'].'.';
            $this->write($dir.'/operation.json', $job);
            if ($job['action'] === 'update') {
                $source = realpath(config('site_maintenance.source'));
                if (! $source || $source === realpath(base_path()) || ! is_dir($source.'/.git')) throw new \RuntimeException('Configure a separate Git checkout with SITE_UPDATE_SOURCE.');
                flock($deploymentLock, LOCK_UN);
                fclose($deploymentLock);
                $deploymentLock = null;
                $this->run(['bash', $source.'/scripts/cpanel-deploy.sh'], null, ['APP_ROOT' => base_path(), 'SOURCE_ROOT' => $source]);
            } elseif ($job['action'] === 'restore') {
                $manifest = $this->validateBackup($job['backup']);
                if ($manifest['driver'] !== DB::connection()->getDriverName()) throw new \RuntimeException('Database driver does not match this backup.');
                $backupDir = $dir.'/'.$job['backup'];
                $databasePath = DB::connection()->getDatabaseName();
                if ($manifest['driver'] === 'sqlite') {
                    DB::statement('PRAGMA wal_checkpoint(TRUNCATE)');
                    DB::disconnect();
                }
                // Only locally created, checksum-verified archives are accepted.
                $this->run(['tar', '-xzf', $backupDir.'/files.tar.gz', '-C', base_path()]);
                if ($manifest['driver'] === 'sqlite') {
                    if (! copy($backupDir.'/database.sqlite', $databasePath)) throw new \RuntimeException('Database restore failed.');
                } else {
                    $stream = fopen($backupDir.'/database.sql', 'r');
                    try {
                        $process = new Process([...$this->mysqlCommand('mysql'), DB::connection()->getDatabaseName()], base_path(), ['MYSQL_PWD' => (string) DB::connection()->getConfig('password')], $stream, 3600);
                        $process->mustRun();
                    } finally { fclose($stream); }
                }
                $this->run([PHP_BINARY, 'artisan', 'optimize:clear']);
                $this->run([PHP_BINARY, 'artisan', 'optimize']);
            }
            $job['status'] = 'completed';
            $job['message'] = ucfirst($job['action']).' completed.';
        } catch (\Throwable $e) {
            $job['status'] = 'failed';
            // Process exceptions can include credentials and server paths; keep them out of API output.
            $job['message'] = 'Operation failed. Check the private server log. The safety backup is retained.';
            file_put_contents($dir.'/failure.log', now()->toIso8601String().' '.$e->getMessage()."\n", FILE_APPEND | LOCK_EX);
            chmod($dir.'/failure.log', 0600);
        } finally {
            if (is_resource($deploymentLock)) { flock($deploymentLock, LOCK_UN); fclose($deploymentLock); }
            if ($maintenance) {
                // A failed restore may leave partial data: keep the site offline for recovery.
                if (($job['status'] ?? '') === 'completed' || ($job['action'] ?? '') !== 'restore') {
                    try { $this->run([PHP_BINARY, 'artisan', 'up']); }
                    catch (\Throwable) { $job['status'] = 'failed'; $job['message'] = 'Could not leave maintenance mode. Server recovery is required.'; }
                }
            }
            if (isset($job) && ($job['status'] ?? '') !== 'queued') $this->write($dir.'/operation.json', $job);
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
}
