<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class CrmAutomationService
{
    public function steps(object $rule): array
    {
        $steps = json_decode($rule->steps_json ?? 'null', true);
        return is_array($steps) && count($steps) ? $steps : [[
            'action_type' => $rule->action_type, 'segment_id' => $rule->segment_id,
            'task_title' => $rule->task_title, 'task_due_days' => $rule->task_due_days,
        ]];
    }

    public function run(int $contactId, string $trigger, ?string $stage = null, ?string $eventKey = null, array $context = []): void
    {
        $contact = DB::table('crm_contacts')->find($contactId);
        if (!$contact) return;
        $context = array_merge($context, ['trigger' => $trigger, 'stage' => $stage ?? $contact->stage]);
        $rules = DB::table('crm_automations')->where('enabled', true)->where('trigger_type', $trigger)->orderBy('id')->get();
        foreach ($rules as $rule) {
            if (!$this->triggerMatches($rule, $contact, $context)) continue;
            $key = $eventKey ?: ($trigger === 'contact_created' ? $trigger : $trigger.':'.Str::uuid());
            $inserted = DB::table('crm_automation_runs')->insertOrIgnore([
                'automation_id' => $rule->id, 'contact_id' => $contactId, 'event_key' => $key,
                'status' => 'pending', 'snapshot_json' => json_encode($this->snapshot($rule)),
                'context_json' => json_encode($context), 'attempts' => 1,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            if (!$inserted) continue;
            $id = DB::table('crm_automation_runs')->where('automation_id', $rule->id)->where('contact_id', $contactId)->where('event_key', $key)->value('id');
            $this->process((int) $id);
        }
    }

    private function snapshot(object $rule): array
    {
        return ['name' => $rule->name, 'steps' => $this->steps($rule), 'conditions' => json_decode($rule->conditions_json ?? 'null', true) ?: []];
    }

    private function triggerMatches(object $rule, object $contact, array $context): bool
    {
        return match ($rule->trigger_type) {
            'stage_changed' => !$rule->trigger_stage || $rule->trigger_stage === ($context['stage'] ?? $contact->stage),
            'subscription_changed' => !($rule->trigger_subscription_status ?? null) || $rule->trigger_subscription_status === ($context['subscription_status'] ?? $contact->subscription_status),
            'segment_added' => (int) ($rule->trigger_segment_id ?? 0) === (int) ($context['segment_id'] ?? 0) && !empty($rule->trigger_segment_id),
            'contact_created' => true,
            default => false,
        };
    }

    private function conditionMismatch(object $contact, array $conditions): ?string
    {
        foreach (['stage' => 'Stage', 'source' => 'Source', 'subscription_status' => 'Subscription status'] as $key => $label) {
            if (!empty($conditions[$key]) && $contact->{$key} !== $conditions[$key]) return "$label does not match the entry filter.";
        }
        if (!empty($conditions['segment_id']) && !DB::table('crm_contact_segments')->where('contact_id', $contact->id)->where('segment_id', $conditions['segment_id'])->exists()) return 'Contact is not in the required list or tag.';
        return null;
    }

    public function preview(object $rule, int $contactId): array
    {
        $contact = DB::table('crm_contacts')->find($contactId);
        abort_unless($contact, 404);
        $context = ['stage' => $contact->stage, 'subscription_status' => $contact->subscription_status];
        if ($rule->trigger_type === 'segment_added' && DB::table('crm_contact_segments')->where('contact_id', $contactId)->where('segment_id', $rule->trigger_segment_id)->exists()) $context['segment_id'] = $rule->trigger_segment_id;
        if (!$this->triggerMatches($rule, $contact, $context)) return ['status' => 'skipped', 'message' => 'This contact does not match the configured trigger target.', 'results' => []];
        $snapshot = $this->snapshot($rule);
        if ($reason = $this->conditionMismatch($contact, $snapshot['conditions'])) return ['status' => 'skipped', 'message' => $reason, 'results' => []];
        DB::beginTransaction();
        try {
            $results = $this->actions($contact, $snapshot['steps']);
            return ['status' => 'completed', 'message' => 'Test passed. These actions would run for a matching event. No changes were saved.', 'results' => $results];
        } catch (Throwable $e) {
            return ['status' => 'failed', 'message' => $this->message($e), 'results' => []];
        } finally {
            DB::rollBack();
        }
    }

    public function retry(int $ruleId, int $runId): void
    {
        DB::transaction(function () use ($ruleId, $runId) {
            $rule = DB::table('crm_automations')->where('id', $ruleId)->lockForUpdate()->first();
            abort_unless($rule, 404);
            abort_unless($rule->enabled, 422, 'Activate the automation before retrying a failed run.');
            $run = DB::table('crm_automation_runs')->where('id', $runId)->where('automation_id', $ruleId)->lockForUpdate()->first();
            abort_unless($run, 404);
            abort_unless($run->status === 'failed', 422, 'Only failed runs can be retried.');
            abort_unless($run->snapshot_json, 422, 'This legacy run has no saved action snapshot.');
            DB::table('crm_automation_runs')->where('id', $runId)->update(['status' => 'pending', 'error' => null, 'attempts' => $run->attempts + 1, 'finished_at' => null, 'updated_at' => now()]);
        });
        $this->process($runId);
    }

    private function process(int $id): void
    {
        try {
            DB::transaction(function () use ($id) {
                $run = DB::table('crm_automation_runs')->where('id', $id)->lockForUpdate()->first();
                if (!$run || $run->status !== 'pending') return;
                $contact = DB::table('crm_contacts')->where('id', $run->contact_id)->lockForUpdate()->first();
                if (!$contact) throw new RuntimeException('The contact no longer exists.');
                $snapshot = json_decode($run->snapshot_json, true);
                $reason = $this->conditionMismatch($contact, $snapshot['conditions'] ?? []);
                $results = $reason ? [] : $this->actions($contact, $snapshot['steps']);
                DB::table('crm_automation_runs')->where('id', $id)->update([
                    'status' => $reason ? 'skipped' : 'completed', 'results_json' => json_encode($results),
                    'error' => $reason, 'finished_at' => now(), 'updated_at' => now(),
                ]);
            });
        } catch (Throwable $e) {
            // The action transaction has rolled back. Keep the failure outside it so contact edits still succeed.
            DB::table('crm_automation_runs')->where('id', $id)->where('status', 'pending')->update([
                'status' => 'failed', 'error' => $this->message($e), 'finished_at' => now(), 'updated_at' => now(),
            ]);
            Log::warning('CRM automation failed', ['run_id' => $id, 'exception' => $e::class]);
        }
    }

    private function message(Throwable $e): string
    {
        return $e instanceof RuntimeException && !$e instanceof \Illuminate\Database\QueryException
            ? Str::limit($e->getMessage(), 500) : 'The actions could not be completed. No action changes were saved. Check the referenced resources and retry.';
    }

    private function actions(object $contact, array $steps): array
    {
        $results = [];
        foreach ($steps as $index => $step) {
            $type = $step['action_type'] ?? '';
            $status = 'completed';
            if (in_array($type, ['segment', 'remove_segment'], true)) {
                $segment = DB::table('crm_segments')->find($step['segment_id'] ?? 0);
                if (!$segment) throw new RuntimeException('Action '.($index + 1).': the selected list or tag no longer exists.');
                if ($type === 'segment') {
                    $changed = DB::table('crm_contact_segments')->insertOrIgnore(['contact_id' => $contact->id, 'segment_id' => $segment->id]);
                    $message = $changed ? 'Added to '.$segment->name : 'Already belongs to '.$segment->name;
                } else {
                    $changed = DB::table('crm_contact_segments')->where('contact_id', $contact->id)->where('segment_id', $segment->id)->delete();
                    $message = $changed ? 'Removed from '.$segment->name : 'Does not belong to '.$segment->name;
                }
                if (!$changed) $status = 'skipped';
            } elseif ($type === 'task') {
                if (!trim($step['task_title'] ?? '')) throw new RuntimeException('Action '.($index + 1).': a task title is required.');
                $title = $this->personalize($step['task_title'], $contact, 190);
                DB::table('crm_tasks')->insert([
                    'contact_id' => $contact->id, 'title' => $title,
                    'due_at' => now()->addDays((int) ($step['task_due_days'] ?? 0))->toDateString(),
                    'priority' => $step['task_priority'] ?? 'normal', 'status' => 'pending', 'completed' => false,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $message = 'Created task: '.$title;
            } elseif ($type === 'note') {
                if (!trim($step['note_body'] ?? '')) throw new RuntimeException('Action '.($index + 1).': note content is required.');
                DB::table('crm_activities')->insert([
                    'contact_id' => $contact->id, 'type' => 'note', 'subject' => 'Automation note',
                    'body' => $this->personalize($step['note_body'], $contact, 10000), 'created_at' => now(), 'updated_at' => now(),
                ]);
                $message = 'Added a note to the contact timeline.';
            } elseif ($type === 'sequence') {
                $program = DB::table('crm_email_programs')->where('kind', 'sequence')->find($step['sequence_id'] ?? 0);
                if (!$program || !$program->enabled) throw new RuntimeException('Action '.($index + 1).': the selected email sequence is missing or paused.');
                $sequenceSteps = json_decode($program->steps, true);
                if (!$sequenceSteps) throw new RuntimeException('Action '.($index + 1).': the selected sequence has no email steps.');
                if ($contact->subscription_status !== 'subscribed' || !filter_var($contact->email, FILTER_VALIDATE_EMAIL)) {
                    $status = 'skipped'; $message = 'Sequence skipped: the contact needs a valid email and an active subscription.';
                } elseif ($program->segment_id && !DB::table('crm_contact_segments')->where('contact_id', $contact->id)->where('segment_id', $program->segment_id)->exists()) {
                    $status = 'skipped'; $message = 'Sequence skipped: contact is outside the sequence audience.';
                } else {
                    $changed = DB::table('crm_email_program_enrollments')->insertOrIgnore([
                        'program_id' => $program->id, 'contact_id' => $contact->id, 'next_step' => 0,
                        'due_at' => now()->addDays((int) ($sequenceSteps[0]['delay_days'] ?? 0)),
                        'status' => 'active', 'created_at' => now(), 'updated_at' => now(),
                    ]);
                    $status = $changed ? 'completed' : 'skipped';
                    $message = $changed ? 'Enrolled in '.$program->name.'. Emails follow the sequence schedule.' : 'Already enrolled in '.$program->name.'. Existing enrollment was kept.';
                }
            } else {
                throw new RuntimeException('Action '.($index + 1).': unsupported action type.');
            }
            $results[] = ['position' => $index + 1, 'action_type' => $type, 'status' => $status, 'message' => $message];
        }
        return $results;
    }

    private function personalize(string $text, object $contact, int $limit): string
    {
        return Str::limit(str_replace(['{{name}}', '{{email}}'], [$contact->name, $contact->email ?? ''], $text), $limit, '');
    }
}
