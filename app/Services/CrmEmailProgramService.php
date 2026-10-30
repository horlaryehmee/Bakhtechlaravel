<?php

namespace App\Services;

use App\Http\Controllers\Api\CrmMarketingController;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class CrmEmailProgramService
{
    public function enroll(int $programId): int
    {
        $program = DB::table('crm_email_programs')->where('kind', 'sequence')->find($programId);
        abort_unless($program, 404);
        $steps = json_decode($program->steps ?: '[]', true) ?: [];
        if (!$steps) return 0;

        $query = DB::table('crm_contacts')->where('subscription_status', 'subscribed')->whereNotNull('email');
        if ($program->segment_id) {
            $query->whereIn('id', DB::table('crm_contact_segments')->where('segment_id', $program->segment_id)->select('contact_id'));
        }
        $count = 0;
        foreach ($query->pluck('id') as $contactId) {
            $count += DB::table('crm_email_program_enrollments')->insertOrIgnore([
                'program_id' => $programId, 'contact_id' => $contactId, 'next_step' => 0,
                'due_at' => now()->addDays((int) ($steps[0]['delay_days'] ?? 0)),
                'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        return $count;
    }

    public function enrollContact(int $contactId): void
    {
        $contact = DB::table('crm_contacts')->find($contactId);
        if (!$contact || $contact->subscription_status !== 'subscribed' || !$contact->email) return;
        foreach (DB::table('crm_email_programs')->where('kind', 'sequence')->where('enabled', true)->get() as $program) {
            if ($program->segment_id && !DB::table('crm_contact_segments')->where('contact_id', $contactId)->where('segment_id', $program->segment_id)->exists()) continue;
            $steps = json_decode($program->steps ?: '[]', true) ?: [];
            if (!$steps) continue;
            DB::table('crm_email_program_enrollments')->insertOrIgnore([
                'program_id' => $program->id, 'contact_id' => $contactId, 'next_step' => 0,
                'due_at' => now()->addDays((int) ($steps[0]['delay_days'] ?? 0)),
                'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function runDue(): array
    {
        $result = ['prepared' => 0, 'sent' => 0, 'failed' => 0, 'skipped' => 0];
        foreach (DB::table('crm_email_programs')->where('kind', 'recurring')->where('enabled', true)->where('next_run_at', '<=', now())->limit(10)->get() as $program) {
            $due = Carbon::parse($program->next_run_at);
            DB::transaction(function () use ($program, $due) {
                $locked = DB::table('crm_email_programs')->where('id', $program->id)->where('next_run_at', $program->next_run_at)->update([
                    'next_run_at' => $this->nextOccurrence($due, $program->frequency), 'updated_at' => now(),
                ]);
                if ($locked) DB::table('crm_email_program_runs')->insertOrIgnore([
                    'program_id' => $program->id, 'run_key' => 'recurring:'.$due->toIso8601String(),
                    'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
                ]);
            });
        }
        $dueEnrollments = DB::table('crm_email_program_enrollments as e')
            ->join('crm_email_programs as p', 'p.id', '=', 'e.program_id')
            ->where('p.enabled', true)->where('e.status', 'active')->where('e.due_at', '<=', now())
            ->select('e.*')->limit(30)->get();
        foreach ($dueEnrollments as $enrollment) {
            DB::table('crm_email_program_runs')->insertOrIgnore([
                'program_id' => $enrollment->program_id, 'contact_id' => $enrollment->contact_id,
                'run_key' => 'contact:'.$enrollment->contact_id.':step:'.$enrollment->next_step,
                'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach (DB::table('crm_email_program_runs')->whereIn('status', ['pending', 'sending'])->orderBy('id')->limit(40)->get() as $run) {
            try {
                $status = $this->processRun($run);
                $result[match ($status) { 'sent' => 'sent', 'skipped' => 'skipped', 'failed' => 'failed', default => 'prepared' }]++;
            } catch (Throwable $error) {
                report($error);
                DB::table('crm_email_program_runs')->where('id', $run->id)->update([
                    'status' => 'failed', 'error' => Str::limit($error->getMessage(), 500), 'updated_at' => now(),
                ]);
                $result['failed']++;
            }
        }
        return $result;
    }

    private function nextOccurrence(Carbon $due, string $frequency): Carbon
    {
        do {
            $due = match ($frequency) {
                'weekly' => $due->addWeek(),
                'monthly' => $due->addMonthNoOverflow(),
                default => $due->addDay(),
            };
        } while ($due->lte(now()));
        return $due;
    }

    private function processRun(object $run): string
    {
        $program = DB::table('crm_email_programs')->find($run->program_id);
        if (!$program || !$program->enabled) return 'pending';
        $steps = json_decode($program->steps ?: '[]', true) ?: [];
        $stepIndex = 0;
        $contact = null;
        if ($program->kind === 'sequence') {
            $enrollment = DB::table('crm_email_program_enrollments')->where('program_id', $program->id)->where('contact_id', $run->contact_id)->first();
            $stepIndex = (int) ($enrollment->next_step ?? -1);
            $contact = DB::table('crm_contacts')->find($run->contact_id);
            if (!$enrollment || $enrollment->status !== 'active' || !$contact || $contact->subscription_status !== 'subscribed' || !filter_var($contact->email, FILTER_VALIDATE_EMAIL)) {
                DB::table('crm_email_program_runs')->where('id', $run->id)->update(['status' => 'skipped', 'updated_at' => now()]);
                if ($enrollment) DB::table('crm_email_program_enrollments')->where('id', $enrollment->id)->update(['status' => 'stopped', 'updated_at' => now()]);
                return 'skipped';
            }
            if ($program->segment_id && !DB::table('crm_contact_segments')->where('contact_id', $contact->id)->where('segment_id', $program->segment_id)->exists()) {
                DB::table('crm_email_program_runs')->where('id', $run->id)->update(['status' => 'skipped', 'updated_at' => now()]);
                DB::table('crm_email_program_enrollments')->where('id', $enrollment->id)->update(['status' => 'stopped', 'updated_at' => now()]);
                return 'skipped';
            }
            if (!isset($steps[$stepIndex])) {
                DB::table('crm_email_program_runs')->where('id', $run->id)->update(['status' => 'skipped', 'updated_at' => now()]);
                return 'skipped';
            }
        }
        if (!$run->campaign_id) {
            $subject = $program->kind === 'sequence' ? $steps[$stepIndex]['subject'] : $program->subject;
            $body = $program->kind === 'sequence' ? $steps[$stepIndex]['body'] : $program->body;
            $campaignId = DB::transaction(function () use ($run, $program, $subject, $body, $stepIndex, $contact) {
                $claimed = DB::table('crm_email_program_runs')->where('id', $run->id)->whereNull('campaign_id')->update(['status' => 'sending', 'updated_at' => now()]);
                if (!$claimed) return DB::table('crm_email_program_runs')->where('id', $run->id)->value('campaign_id');
                $id = DB::table('crm_campaigns')->insertGetId([
                    'name' => Str::limit($program->name.($program->kind === 'sequence' ? ' · Step '.($stepIndex + 1) : ' · '.now()->format('Y-m-d H:i')), 160),
                    'subject' => $subject, 'body' => $body, 'editor_type' => $program->editor_type,
                    'segment_id' => $program->segment_id, 'status' => 'sending', 'created_at' => now(), 'updated_at' => now(),
                ]);
                $query = DB::table('crm_contacts')->where('subscription_status', 'subscribed')->whereNotNull('email');
                if ($contact) $query->where('id', $contact->id);
                elseif ($program->segment_id) $query->whereIn('id', DB::table('crm_contact_segments')->where('segment_id', $program->segment_id)->select('contact_id'));
                foreach ($query->pluck('id') as $contactId) DB::table('crm_campaign_deliveries')->insert([
                    'campaign_id' => $id, 'contact_id' => $contactId, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
                ]);
                DB::table('crm_email_program_runs')->where('id', $run->id)->update(['campaign_id' => $id, 'updated_at' => now()]);
                return $id;
            });
        } else $campaignId = $run->campaign_id;

        if (!DB::table('crm_campaign_deliveries')->where('campaign_id', $campaignId)->exists()) {
            DB::table('crm_campaigns')->where('id', $campaignId)->update(['status' => 'sent', 'sent_at' => now(), 'updated_at' => now()]);
            DB::table('crm_email_program_runs')->where('id', $run->id)->update(['status' => 'skipped', 'updated_at' => now()]);
            return 'skipped';
        }
        DB::table('crm_campaign_deliveries')->where('campaign_id', $campaignId)->where('status', 'processing')
            ->where('updated_at', '<', now()->subMinutes(10))->update(['status' => 'pending', 'updated_at' => now()]);
        $sender = app(CrmMarketingController::class);
        for ($batch = 0; $batch < 5 && DB::table('crm_campaign_deliveries')->where('campaign_id', $campaignId)->where('status', 'pending')->exists(); $batch++) {
            $sender->sendBatch($campaignId);
        }
        if (DB::table('crm_campaign_deliveries')->where('campaign_id', $campaignId)->whereIn('status', ['pending', 'processing'])->exists()) return 'pending';
        $failed = DB::table('crm_campaign_deliveries')->where('campaign_id', $campaignId)->where('status', 'failed')->exists();
        $status = $failed ? 'failed' : 'sent';
        DB::table('crm_email_program_runs')->where('id', $run->id)->update(['status' => $status, 'error' => $failed ? 'One or more email deliveries failed.' : null, 'updated_at' => now()]);
        if ($program->kind === 'sequence' && !$failed) {
            $next = $stepIndex + 1;
            DB::table('crm_email_program_enrollments')->where('program_id', $program->id)->where('contact_id', $contact->id)->where('next_step', $stepIndex)->update([
                'next_step' => $next,
                'due_at' => isset($steps[$next]) ? now()->addDays((int) ($steps[$next]['delay_days'] ?? 0)) : now(),
                'status' => isset($steps[$next]) ? 'active' : 'completed', 'updated_at' => now(),
            ]);
        }
        return $status;
    }
}
