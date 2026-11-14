<?php
namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class PortalInvitationService
{
    public function copyLink(int $userId): array
    {
        return DB::transaction(function () use ($userId) {
            $user = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            abort_unless($user, 404);
            abort_unless($user->portal_active && !$user->portal_password_set, 422, 'Passwordless links are only available for active clients who have not set a password.');
            $invite = DB::table('portal_invitations')->where('user_id', $userId)->whereNull('revoked_at')->where('expires_at', '>', now())->latest('id')->first();
            $secret = $invite?->encrypted_secret ? Crypt::decryptString($invite->encrypted_secret) : null;
            if ($invite && !$secret) {
                $payload = DB::table('portal_invitation_mail')->where('invitation_id', $invite->id)->whereNotNull('encrypted_payload')->latest('id')->value('encrypted_payload');
                if ($payload) {
                    $url = json_decode(Crypt::decryptString($payload), true)['url'];
                    $candidate = explode('#invite=', $url)[1] ?? '';
                    if (hash_equals($invite->token_hash, hash('sha256', $candidate))) {
                        $secret = $candidate;
                        DB::table('portal_invitations')->where('id', $invite->id)->update(['encrypted_secret' => Crypt::encryptString($secret)]);
                    }
                }
            }
            $created = !$secret;
            if (!$secret) {
                $secret = bin2hex(random_bytes(32));
                $id = DB::table('portal_invitations')->insertGetId(['user_id' => $userId, 'token_hash' => hash('sha256', $secret), 'encrypted_secret' => Crypt::encryptString($secret), 'expires_at' => now()->addDays(30), 'created_at' => now(), 'updated_at' => now()]);
                $invite = DB::table('portal_invitations')->find($id);
            }
            return ['url' => rtrim(config('app.url'), '/').'/portal#invite='.$secret, 'expires_at' => $invite->expires_at, 'created' => $created];
        });
    }

    public function queue(int $userId): int
    {
        return DB::transaction(function () use ($userId) {
            $user = DB::table('users')->where('id', $userId)->lockForUpdate()->first();
            abort_unless($user && $user->portal_active, 422, 'Activate the client account before inviting them.');
            $this->revoke($userId);
            $url = rtrim(config('app.url'), '/').'/portal';
            $invitationId = null;
            if (!$user->portal_password_set) {
                $secret = bin2hex(random_bytes(32));
                $invitationId = DB::table('portal_invitations')->insertGetId(['user_id' => $userId, 'token_hash' => hash('sha256', $secret), 'expires_at' => now()->addDays(30), 'created_at' => now(), 'updated_at' => now()]);
                // Fragments are not sent in HTTP request URLs, referrers or server access logs.
                DB::table('portal_invitations')->where('id', $invitationId)->update(['encrypted_secret' => Crypt::encryptString($secret)]);
                $url .= '#invite='.$secret;
            }
            $id = DB::table('portal_invitation_mail')->insertGetId(['user_id' => $userId, 'invitation_id' => $invitationId, 'encrypted_payload' => Crypt::encryptString(json_encode(['email' => $user->email, 'name' => $user->name, 'url' => $url, 'passwordless' => !$user->portal_password_set])), 'status' => 'pending', 'next_attempt_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            if ($user->crm_contact_id) DB::table('crm_activities')->insert(['contact_id' => $user->crm_contact_id, 'type' => 'note', 'subject' => 'Client portal invitation queued', 'body' => 'Portal account linked. Invitation delivery is tracked in client management.', 'source_type' => 'portal_invitation', 'source_id' => $id, 'created_at' => now(), 'updated_at' => now()]);
            return $id;
        });
    }

    public function revoke(int $userId): void
    {
        DB::table('portal_invitations')->where('user_id', $userId)->whereNull('revoked_at')->update(['revoked_at' => now(), 'encrypted_secret' => null, 'updated_at' => now()]);
        DB::table('portal_invitation_mail')->where('user_id', $userId)->whereIn('status', ['pending', 'retry'])->update(['status' => 'cancelled', 'encrypted_payload' => null, 'updated_at' => now()]);
    }

    public function deliver(int $id): string
    {
        return Cache::lock('portal-mail-'.$id, 120)->get(function () use ($id) {
            $mail = DB::table('portal_invitation_mail')->where('id', $id)->first();
            if (!$mail || !in_array($mail->status, ['pending', 'retry'])) return $mail?->status ?? 'missing';
            // Log and array mailers must never be presented as real delivery or log bearer links.
            $transport = config('mail.mailers.'.config('mail.default').'.transport');
            if (!app()->environment('testing') && !in_array($transport, ['smtp', 'sendmail', 'ses', 'ses-v2', 'postmark', 'mailgun'])) {
                DB::table('portal_invitation_mail')->where('id', $id)->update(['status' => 'retry', 'error' => 'Email delivery is not configured. Configure SMTP in admin mail settings.', 'next_attempt_at' => now()->addMinutes(5), 'updated_at' => now()]);
                return 'retry';
            }
            if ($transport === 'smtp') config(['mail.mailers.'.config('mail.default').'.timeout' => 10]);
            try {
                $payload = json_decode(Crypt::decryptString($mail->encrypted_payload), true);
                $user = DB::table('users')->where('id', $mail->user_id)->first();
                $invite = $mail->invitation_id ? DB::table('portal_invitations')->where('id', $mail->invitation_id)->first() : null;
                if (!$user?->portal_active || $user->email !== $payload['email'] || ($payload['passwordless'] && ($user->portal_password_set || !$invite || $invite->revoked_at || now()->greaterThan($invite->expires_at)))) {
                    DB::table('portal_invitation_mail')->where('id', $id)->update(['status' => 'cancelled', 'encrypted_payload' => null, 'updated_at' => now()]); return 'cancelled';
                }
                Mail::send('mail.portal-invitation', $payload, function ($message) use ($payload) {
                    $message->to($payload['email'])->subject('Your Bakhtech project workspace is ready');
                    $message->getSymfonyMessage()->getHeaders()->addTextHeader('X-Bakhtech-Source', 'portal-invitation');
                });
                DB::table('portal_invitation_mail')->where('id', $id)->update(['status' => 'sent', 'encrypted_payload' => null, 'sent_at' => now(), 'attempts' => $mail->attempts + 1, 'error' => null, 'updated_at' => now()]);
                return 'sent';
            } catch (\Throwable) {
                DB::table('portal_invitation_mail')->where('id', $id)->update(['status' => 'retry', 'attempts' => $mail->attempts + 1, 'error' => 'Delivery failed. Check connectivity and admin SMTP settings, then retry.', 'next_attempt_at' => now()->addMinutes(15), 'updated_at' => now()]);
                return 'retry';
            }
        }) ?: 'pending';
    }
}
