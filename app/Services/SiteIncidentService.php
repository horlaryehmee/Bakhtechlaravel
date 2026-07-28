<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Throwable;

class SiteIncidentService
{
    private const NOTIFY_COOLDOWN_MINUTES = 15;

    public function reportThrowable(Throwable $exception, array $context = []): void
    {
        $this->report([
            'severity' => 'error',
            'type' => class_basename($exception),
            'source' => 'exception-handler',
            'message' => $exception->getMessage() ?: class_basename($exception),
            'url' => (string) ($context['url'] ?? ''),
            'method' => (string) ($context['method'] ?? ''),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'context' => $context,
        ]);
    }

    public function runHealthCheck(?string $url = null): array
    {
        $target = rtrim($url ?: (string) config('app.url'), '/').'/api/ready';
        $started = microtime(true);

        try {
            $response = Http::timeout(15)->acceptJson()->get($target);
            $durationMs = (int) round((microtime(true) - $started) * 1000);

            if (! $response->ok()) {
                $this->report([
                    'severity' => 'critical',
                    'type' => 'health_check_http_failure',
                    'source' => 'site-monitor',
                    'message' => "Health check returned HTTP {$response->status()}",
                    'url' => $target,
                    'context' => [
                        'status' => $response->status(),
                        'durationMs' => $durationMs,
                        'body' => mb_substr($response->body(), 0, 2000),
                    ],
                ]);
            }

            return [
                'ok' => $response->ok(),
                'status' => $response->status(),
                'url' => $target,
                'durationMs' => $durationMs,
            ];
        } catch (Throwable $exception) {
            $durationMs = (int) round((microtime(true) - $started) * 1000);
            $this->report([
                'severity' => 'critical',
                'type' => 'health_check_unreachable',
                'source' => 'site-monitor',
                'message' => $exception->getMessage(),
                'url' => $target,
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString(),
                'context' => ['durationMs' => $durationMs],
            ]);

            return [
                'ok' => false,
                'status' => 0,
                'url' => $target,
                'durationMs' => $durationMs,
                'message' => $exception->getMessage(),
            ];
        }
    }

    public function report(array $incident): void
    {
        $fingerprint = $this->fingerprint($incident);
        $now = now();
        $recipient = $this->adminEmail();

        try {
            if (! Schema::hasTable('site_incidents')) {
                Log::error('Site incident table is missing.', $incident);
                return;
            }

            $existing = DB::table('site_incidents')->where('fingerprint', $fingerprint)->first();
            $shouldNotify = true;

            if ($existing) {
                $lastNotifiedAt = $existing->last_notified_at ? Carbon::parse($existing->last_notified_at) : null;
                $shouldNotify = ! $lastNotifiedAt || $lastNotifiedAt->lte($now->copy()->subMinutes(self::NOTIFY_COOLDOWN_MINUTES));

                DB::table('site_incidents')->where('id', $existing->id)->update([
                    'message' => mb_substr((string) ($incident['message'] ?? 'Website issue detected'), 0, 1000),
                    'status' => 'open',
                    'occurrence_count' => ((int) $existing->occurrence_count) + 1,
                    'last_seen_at' => $now,
                    'last_notified_at' => $shouldNotify ? $now : $existing->last_notified_at,
                    'resolved_at' => null,
                    'context' => json_encode($incident['context'] ?? []),
                    'trace' => (string) ($incident['trace'] ?? ''),
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('site_incidents')->insert([
                    'fingerprint' => $fingerprint,
                    'severity' => (string) ($incident['severity'] ?? 'error'),
                    'type' => mb_substr((string) ($incident['type'] ?? 'website_issue'), 0, 80),
                    'source' => mb_substr((string) ($incident['source'] ?? 'website'), 0, 120),
                    'message' => mb_substr((string) ($incident['message'] ?? 'Website issue detected'), 0, 1000),
                    'url' => mb_substr((string) ($incident['url'] ?? ''), 0, 1000),
                    'method' => mb_substr((string) ($incident['method'] ?? ''), 0, 16),
                    'file' => mb_substr((string) ($incident['file'] ?? ''), 0, 1000),
                    'line' => isset($incident['line']) ? (int) $incident['line'] : null,
                    'status' => 'open',
                    'occurrence_count' => 1,
                    'first_seen_at' => $now,
                    'last_seen_at' => $now,
                    'last_notified_at' => $now,
                    'context' => json_encode($incident['context'] ?? []),
                    'trace' => (string) ($incident['trace'] ?? ''),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            if ($shouldNotify && $recipient !== '') {
                $this->sendAlert($recipient, array_merge($incident, ['fingerprint' => $fingerprint]));
            }
        } catch (Throwable $exception) {
            Log::error('Unable to record site incident.', [
                'incident' => $incident,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function diagnostics(): array
    {
        $checks = [];

        $checks[] = $this->check('application', 'Application booted', true, 'Laravel is responding.');

        try {
            DB::connection()->getPdo();
            $checks[] = $this->check('database', 'Database connection', true, 'Database connection succeeded.');
        } catch (Throwable $exception) {
            $checks[] = $this->check('database', 'Database connection', false, $exception->getMessage());
        }

        $storageWritable = is_writable(storage_path()) && is_writable(storage_path('logs'));
        $checks[] = $this->check('storage', 'Storage writable', $storageWritable, $storageWritable ? 'Storage and logs are writable.' : 'Storage or logs directory is not writable.');

        try {
            $mailEnabled = Schema::hasTable('mail_settings') && (bool) DB::table('mail_settings')->value('enabled');
            $checks[] = $this->check('mail', 'SMTP alerts', $mailEnabled, $mailEnabled ? 'SMTP is enabled for outgoing alerts.' : 'SMTP is not enabled; incident emails cannot be delivered.');
        } catch (Throwable $exception) {
            $checks[] = $this->check('mail', 'SMTP alerts', false, 'Unable to check SMTP settings: '.$exception->getMessage());
        }

        return $checks;
    }

    private function check(string $key, string $label, bool $ok, string $message): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'ok' => $ok,
            'status' => $ok ? 'ok' : 'issue',
            'message' => $message,
        ];
    }

    private function sendAlert(string $recipient, array $incident): void
    {
        try {
            app(MailConfigurationService::class)->apply();

            $subject = '['.strtoupper((string) ($incident['severity'] ?? 'error')).'] Bakhtech website issue: '.(string) ($incident['type'] ?? 'website_issue');
            $lines = [
                'A website issue was detected.',
                '',
                'Type: '.(string) ($incident['type'] ?? ''),
                'Severity: '.(string) ($incident['severity'] ?? ''),
                'Source: '.(string) ($incident['source'] ?? ''),
                'Message: '.(string) ($incident['message'] ?? ''),
                'URL: '.(string) ($incident['url'] ?? ''),
                'Method: '.(string) ($incident['method'] ?? ''),
                'File: '.(string) ($incident['file'] ?? ''),
                'Line: '.(string) ($incident['line'] ?? ''),
                'Fingerprint: '.(string) ($incident['fingerprint'] ?? ''),
                'Detected at: '.now()->toDateTimeString(),
                '',
                'Context:',
                json_encode($incident['context'] ?? [], JSON_PRETTY_PRINT),
                '',
                'Trace:',
                mb_substr((string) ($incident['trace'] ?? ''), 0, 6000),
            ];

            Mail::raw(implode("\n", $lines), function ($message) use ($recipient, $subject) {
                $message->to($recipient)
                    ->subject($subject)
                    ->getHeaders()
                    ->addTextHeader('X-Bakhtech-Source', 'site-incident-alert');
            });
        } catch (Throwable $exception) {
            Log::error('Unable to send site incident alert email.', ['error' => $exception->getMessage()]);
        }
    }

    private function adminEmail(): string
    {
        try {
            if (Schema::hasTable('settings')) {
                $settings = DB::table('settings')->whereIn('key', ['adminEmail', 'contactEmail'])->pluck('value', 'key');
                $email = trim((string) ($settings['adminEmail'] ?? $settings['contactEmail'] ?? ''));
                if ($email !== '') {
                    return $email;
                }
            }
        } catch (Throwable) {
            //
        }

        return trim((string) config('mail.from.address', ''));
    }

    private function fingerprint(array $incident): string
    {
        return hash('sha256', implode('|', [
            $incident['type'] ?? '',
            $incident['source'] ?? '',
            $incident['file'] ?? '',
            $incident['line'] ?? '',
            $incident['url'] ?? '',
            mb_substr((string) ($incident['message'] ?? ''), 0, 180),
        ]));
    }
}
