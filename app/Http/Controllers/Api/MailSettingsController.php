<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MailConfigurationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;

class MailSettingsController extends Controller
{
    public function __construct(private readonly MailConfigurationService $mailConfiguration)
    {
    }

    public function show()
    {
        return ['settings' => $this->mailConfiguration->settings()];
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'host' => ['required_if:enabled,true', 'nullable', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'encryption' => ['required', Rule::in(['tls', 'ssl', 'none'])],
            'username' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'max:1000'],
            'clearPassword' => ['nullable', 'boolean'],
            'fromAddress' => ['required', 'email', 'max:255'],
            'fromName' => ['required', 'string', 'max:255'],
        ]);

        return ['settings' => $this->mailConfiguration->save($data)];
    }

    public function test(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);
        $settings = $this->mailConfiguration->settings();

        if (! $settings['enabled']) {
            return response()->json(['message' => 'Enable and save SMTP settings before sending a test email.'], 422);
        }

        $this->mailConfiguration->apply();

        try {
            Mail::raw(
                'This is a test email from the Bakhtech website SMTP settings.',
                function ($message) use ($data) {
                    $message->to($data['email'])
                        ->subject('Bakhtech SMTP test')
                        ->getHeaders()
                        ->addTextHeader('X-Bakhtech-Source', 'smtp-test');
                }
            );
        } catch (\Throwable $exception) {
            DB::table('email_logs')->insert([
                'recipient' => strtolower($data['email']),
                'subject' => 'Bakhtech SMTP test',
                'source' => 'smtp-test',
                'mailer' => 'smtp',
                'status' => 'failed',
                'error_message' => $exception->getMessage(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json(['message' => 'Test email failed: '.$exception->getMessage()], 422);
        }

        return ['message' => 'Test email sent successfully.'];
    }

    public function logs(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', Rule::in(['sent', 'failed'])],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);
        $page = (int) ($data['page'] ?? 1);
        $perPage = (int) ($data['perPage'] ?? 25);
        $query = DB::table('email_logs')
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($data['search'] ?? null, function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('recipient', 'like', "%{$search}%")
                        ->orWhere('subject', 'like', "%{$search}%")
                        ->orWhere('source', 'like', "%{$search}%");
                });
            });
        $total = (clone $query)->count();
        $logs = $query->orderByDesc('created_at')->forPage($page, $perPage)->get();

        return [
            'logs' => $logs->map(fn ($log) => [
                'id' => (int) $log->id,
                'recipient' => $log->recipient,
                'subject' => (string) $log->subject,
                'source' => $log->source,
                'mailer' => (string) $log->mailer,
                'status' => $log->status,
                'errorMessage' => (string) $log->error_message,
                'sentAt' => (string) $log->sent_at,
                'createdAt' => (string) $log->created_at,
            ]),
            'meta' => [
                'page' => $page,
                'perPage' => $perPage,
                'total' => $total,
                'lastPage' => max(1, (int) ceil($total / $perPage)),
            ],
        ];
    }

    public function clear()
    {
        $deleted = DB::table('email_logs')->delete();

        return ['deleted' => $deleted];
    }
}
