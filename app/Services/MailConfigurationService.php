<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class MailConfigurationService
{
    public function settings(): array
    {
        $row = $this->row();

        if (! $row) {
            return [
                'enabled' => false,
                'host' => '',
                'port' => 587,
                'encryption' => 'tls',
                'username' => '',
                'password' => '',
                'hasPassword' => false,
                'fromAddress' => (string) config('mail.from.address', ''),
                'fromName' => (string) config('mail.from.name', ''),
            ];
        }

        return [
            'enabled' => (bool) $row->enabled,
            'host' => (string) $row->host,
            'port' => (int) $row->port,
            'encryption' => (string) $row->encryption,
            'username' => (string) $row->username,
            'password' => '',
            'hasPassword' => filled($row->password),
            'fromAddress' => (string) $row->from_address,
            'fromName' => (string) $row->from_name,
        ];
    }

    public function save(array $data): array
    {
        $existing = $this->row();
        $password = $existing?->password;

        if (filled($data['password'] ?? null)) {
            $password = Crypt::encryptString((string) $data['password']);
        } elseif (($data['clearPassword'] ?? false) === true) {
            $password = null;
        }

        DB::table('mail_settings')->updateOrInsert(
            ['id' => 1],
            [
                'enabled' => (bool) $data['enabled'],
                'host' => trim((string) $data['host']),
                'port' => (int) $data['port'],
                'encryption' => (string) $data['encryption'],
                'username' => trim((string) ($data['username'] ?? '')),
                'password' => $password,
                'from_address' => strtolower(trim((string) $data['fromAddress'])),
                'from_name' => trim((string) $data['fromName']),
                'created_at' => $existing?->created_at ?? now(),
                'updated_at' => now(),
            ]
        );

        $this->apply();

        return $this->settings();
    }

    public function apply(): void
    {
        $row = $this->row();

        if (! $row || ! $row->enabled || blank($row->host)) {
            return;
        }

        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.transport' => 'smtp',
            'mail.mailers.smtp.scheme' => $row->encryption === 'ssl' ? 'smtps' : null,
            'mail.mailers.smtp.host' => $row->host,
            'mail.mailers.smtp.port' => (int) $row->port,
            'mail.mailers.smtp.username' => $row->username ?: null,
            'mail.mailers.smtp.password' => $this->decryptPassword($row->password),
            'mail.mailers.smtp.auto_tls' => $row->encryption !== 'none',
            'mail.from.address' => $row->from_address,
            'mail.from.name' => $row->from_name,
        ]);

        Mail::purge('smtp');
    }

    private function row(): ?object
    {
        if (! Schema::hasTable('mail_settings')) {
            return null;
        }

        return DB::table('mail_settings')->where('id', 1)->first();
    }

    private function decryptPassword(?string $password): ?string
    {
        if (blank($password)) {
            return null;
        }

        try {
            return Crypt::decryptString($password);
        } catch (\Throwable) {
            return null;
        }
    }
}
