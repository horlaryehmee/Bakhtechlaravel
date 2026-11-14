<?php
namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class PaidInvoiceClientService
{
    public function afterPayment(int $documentId): void
    {
        // Provisioning failure must not undo a verified payment; scheduled reconciliation retries it.
        try { $this->sync($documentId); }
        catch (\Throwable $exception) { report($exception); }
    }
    public function sync(int $documentId): ?int
    {
        if (!Schema::hasColumn('users', 'crm_contact_id')) return null;
        $document = DB::table('invoice_documents')->find($documentId);
        if (!$document || $document->type !== 'invoice' || in_array($document->status, ['cancelled', 'rejected'])) return null;
        $confirmed = DB::table('invoice_payments')->where('document_id', $documentId)->whereIn('status', ['paid', 'completed', 'success', 'successful'])->where('amount', '>', 0)->exists();
        if (!$confirmed && !((float) $document->amount_paid > 0 && in_array($document->status, ['partial', 'paid']))) return null;
        $client = DB::table('invoice_clients')->find($document->client_id);
        $email = strtolower(trim($client?->email ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return null;

        return Cache::lock('portal-qualify-'.hash('sha256', $email), 30)->block(5, function () use ($client, $email, $documentId) {
            return DB::transaction(function () use ($client, $email, $documentId) {
                $crm = DB::table('crm_contacts')->whereRaw('LOWER(email) = ?', [$email])->first();
                if (!$crm) {
                    $crmId = DB::table('crm_contacts')->insertGetId(['email' => $email, 'name' => mb_substr($client->name ?: $email, 0, 190), 'company' => mb_substr($client->company_name ?? '', 0, 190), 'phone' => $client->phone, 'stage' => 'won', 'source' => 'client', 'created_at' => now(), 'updated_at' => now()]);
                } else {
                    $crmId = $crm->id;
                    DB::table('crm_contacts')->where('id', $crmId)->update(['stage' => 'won', 'updated_at' => now()]);
                }
                $user = DB::table('users')->whereRaw('LOWER(email) = ?', [$email])->lockForUpdate()->first();
                if ($user) {
                    $id = $user->id;
                    // A payment never overrides an explicit account deactivation or password.
                    if (!$user->crm_contact_id) DB::table('users')->where('id', $id)->update(['crm_contact_id' => $crmId, 'updated_at' => now()]);
                } else {
                    $id = DB::table('users')->insertGetId(['email' => $email, 'name' => $client->name ?: $email, 'company' => $client->company_name, 'password' => Hash::make(Str::random(80)), 'portal_active' => true, 'portal_password_set' => false, 'crm_contact_id' => $crmId, 'created_at' => now(), 'updated_at' => now()]);
                    app(PortalInvitationService::class)->queue($id);
                }
                DB::table('crm_activities')->insertOrIgnore(['contact_id' => $crmId, 'type' => 'note', 'subject' => 'Invoice payment qualified portal client', 'body' => 'A confirmed invoice payment linked this contact to the client portal. Project scope can now be assigned by the team.', 'source_type' => 'portal_paid_invoice', 'source_id' => $documentId, 'created_at' => now(), 'updated_at' => now()]);
                return $id;
            });
        });
    }

    public function reconcile(): array
    {
        $result = ['qualified_invoices' => 0, 'skipped_invoices' => 0];
        DB::table('invoice_documents')->where('type', 'invoice')->whereNotIn('status', ['cancelled', 'rejected'])->where(function ($q) {
            $q->where('amount_paid', '>', 0)->orWhereIn('id', DB::table('invoice_payments')->whereIn('status', ['paid', 'completed', 'success', 'successful'])->where('amount', '>', 0)->select('document_id'));
        })->orderBy('id')->chunkById(100, function ($documents) use (&$result) {
            foreach ($documents as $document) $result[$this->sync($document->id) ? 'qualified_invoices' : 'skipped_invoices']++;
        });
        return $result;
    }
}
