<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CrmAutomationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CrmAutomationController extends Controller
{
    public function index()
    {
        return $this->query()->orderByDesc('a.id')->get()->map(fn ($rule) => $this->format($rule));
    }

    private function query()
    {
        return DB::table('crm_automations as a')->select('a.*')
            ->selectSub(DB::table('crm_automation_runs as r')->whereColumn('r.automation_id', 'a.id')->selectRaw('count(*)'), 'run_count')
            ->selectSub(DB::table('crm_automation_runs as r')->whereColumn('r.automation_id', 'a.id')->where('status', 'completed')->selectRaw('count(*)'), 'completed_count')
            ->selectSub(DB::table('crm_automation_runs as r')->whereColumn('r.automation_id', 'a.id')->where('status', 'failed')->selectRaw('count(*)'), 'failed_count')
            ->selectSub(DB::table('crm_automation_runs as r')->whereColumn('r.automation_id', 'a.id')->where('status', 'skipped')->selectRaw('count(*)'), 'skipped_count')
            ->selectSub(DB::table('crm_automation_runs as r')->whereColumn('r.automation_id', 'a.id')->selectRaw('max(created_at)'), 'last_run_at');
    }

    private function format(object $rule): object
    {
        $rule->enabled = (bool) $rule->enabled;
        $rule->steps = app(CrmAutomationService::class)->steps($rule);
        $rule->conditions = (object) (json_decode($rule->conditions_json ?? 'null', true) ?: []);
        return $rule;
    }

    public function show(int $id)
    {
        $rule = $this->query()->where('a.id', $id)->first();
        abort_unless($rule, 404);
        return $this->format($rule);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:190', 'description' => 'nullable|string|max:2000', 'enabled' => 'required|boolean',
            'trigger_type' => 'required|in:contact_created,stage_changed,subscription_changed,segment_added',
            'trigger_stage' => 'nullable|in:new,contacted,qualified,proposal,negotiation,won,lost',
            'trigger_segment_id' => 'nullable|required_if:trigger_type,segment_added|integer|exists:crm_segments,id',
            'trigger_subscription_status' => 'nullable|in:subscribed,unsubscribed',
            'conditions' => 'nullable|array:stage,source,subscription_status,segment_id',
            'conditions.stage' => 'nullable|in:new,contacted,qualified,proposal,negotiation,won,lost',
            'conditions.source' => 'nullable|string|max:40',
            'conditions.subscription_status' => 'nullable|in:subscribed,unsubscribed',
            'conditions.segment_id' => 'nullable|integer|exists:crm_segments,id',
            'steps' => 'sometimes|array|min:1|max:20',
            'steps.*.action_type' => 'required|in:segment,remove_segment,task,note,sequence',
            'steps.*.segment_id' => 'nullable|integer|exists:crm_segments,id',
            'steps.*.task_title' => 'nullable|string|max:190', 'steps.*.task_due_days' => 'nullable|integer|min:0|max:365',
            'steps.*.task_priority' => 'nullable|in:low,normal,high', 'steps.*.note_body' => 'nullable|string|max:10000',
            'steps.*.sequence_id' => ['nullable', 'integer', Rule::exists('crm_email_programs', 'id')->where('kind', 'sequence')],
            // Accept the original single-action API, while treating steps as the source of truth.
            'action_type' => 'required_without:steps|in:segment,task', 'segment_id' => 'nullable|integer|exists:crm_segments,id',
            'task_title' => 'nullable|string|max:190', 'task_due_days' => 'nullable|integer|min:0|max:365',
        ]);
        $steps = $data['steps'] ?? [['action_type' => $data['action_type'], 'segment_id' => $data['segment_id'] ?? null, 'task_title' => $data['task_title'] ?? null, 'task_due_days' => $data['task_due_days'] ?? 0]];
        $normalized = [];
        foreach ($steps as $index => $step) {
            $type = $step['action_type'];
            if (in_array($type, ['segment', 'remove_segment']) && empty($step['segment_id'])) throw ValidationException::withMessages(["steps.$index.segment_id" => 'Choose a list or tag for action '.($index + 1).'.']);
            if ($type === 'task' && !trim($step['task_title'] ?? '')) throw ValidationException::withMessages(["steps.$index.task_title" => 'Enter a task title for action '.($index + 1).'.']);
            if ($type === 'note' && !trim($step['note_body'] ?? '')) throw ValidationException::withMessages(["steps.$index.note_body" => 'Enter note content for action '.($index + 1).'.']);
            if ($type === 'sequence' && empty($step['sequence_id'])) throw ValidationException::withMessages(["steps.$index.sequence_id" => 'Choose an email sequence for action '.($index + 1).'.']);
            if ($type === 'sequence' && $data['enabled'] && !DB::table('crm_email_programs')->where('id', $step['sequence_id'])->where('enabled', true)->exists()) throw ValidationException::withMessages(["steps.$index.sequence_id" => 'Activate the selected email sequence before activating this automation.']);
            $normalized[] = [
                'action_type' => $type,
                'segment_id' => in_array($type, ['segment', 'remove_segment']) ? (int) $step['segment_id'] : null,
                'task_title' => $type === 'task' ? trim($step['task_title']) : null,
                'task_due_days' => $type === 'task' ? (int) ($step['task_due_days'] ?? 0) : null,
                'task_priority' => $type === 'task' ? ($step['task_priority'] ?? 'normal') : null,
                'note_body' => $type === 'note' ? trim($step['note_body']) : null,
                'sequence_id' => $type === 'sequence' ? (int) $step['sequence_id'] : null,
            ];
        }
        return [
            'name' => trim($data['name']), 'description' => $data['description'] ?? null, 'enabled' => $data['enabled'],
            'trigger_type' => $data['trigger_type'], 'trigger_stage' => $data['trigger_type'] === 'stage_changed' ? ($data['trigger_stage'] ?? null) : null,
            'trigger_segment_id' => $data['trigger_type'] === 'segment_added' ? $data['trigger_segment_id'] : null,
            'trigger_subscription_status' => $data['trigger_type'] === 'subscription_changed' ? ($data['trigger_subscription_status'] ?? null) : null,
            'conditions_json' => json_encode(array_filter($data['conditions'] ?? [], fn ($value) => $value !== null && $value !== '')),
            'steps_json' => json_encode($normalized), 'action_type' => $normalized[0]['action_type'],
            'segment_id' => $normalized[0]['segment_id'], 'task_title' => $normalized[0]['task_title'], 'task_due_days' => $normalized[0]['task_due_days'],
        ];
    }

    public function save(Request $request, ?int $id = null)
    {
        $data = $this->validated($request);
        if ($id) {
            abort_unless(DB::table('crm_automations')->where('id', $id)->exists(), 404);
            DB::table('crm_automations')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        } else {
            $id = DB::table('crm_automations')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        }
        return $this->show($id);
    }

    public function status(Request $request, int $id)
    {
        $data = $request->validate(['enabled' => 'required|boolean']);
        $rule = $this->show($id);
        if ($data['enabled']) {
            $input = (array) $rule;
            $input['conditions'] = (array) $rule->conditions;
            $input['enabled'] = true;
            unset($input['action_type'], $input['segment_id'], $input['task_title'], $input['task_due_days']);
            $this->validated(new Request($input));
        }
        DB::table('crm_automations')->where('id', $id)->update(['enabled' => $data['enabled'], 'updated_at' => now()]);
        return $this->show($id);
    }

    public function duplicate(int $id)
    {
        $source = DB::table('crm_automations')->find($id);
        abort_unless($source, 404);
        $data = (array) $source;
        unset($data['id']);
        $data['name'] = Str::limit($source->name, 183, '').' (copy)';
        $data['enabled'] = false;
        $data['created_at'] = $data['updated_at'] = now();
        return $this->show(DB::table('crm_automations')->insertGetId($data));
    }

    public function destroy(int $id)
    {
        abort_unless(DB::table('crm_automations')->where('id', $id)->delete(), 404);
        return response()->noContent();
    }

    private function runsQuery()
    {
        return DB::table('crm_automation_runs as r')->join('crm_automations as a', 'a.id', '=', 'r.automation_id')
            ->join('crm_contacts as c', 'c.id', '=', 'r.contact_id')
            ->select('r.*', 'c.name', 'c.email', 'a.name as automation', 'a.enabled as automation_enabled');
    }

    private function formatRun(object $run): object
    {
        $run->results = json_decode($run->results_json ?? 'null', true) ?: [];
        $run->snapshot = json_decode($run->snapshot_json ?? 'null', true);
        $run->context = json_decode($run->context_json ?? 'null', true);
        $run->automation_enabled = (bool) $run->automation_enabled;
        unset($run->results_json, $run->snapshot_json, $run->context_json);
        return $run;
    }

    public function runs(int $id)
    {
        abort_unless(DB::table('crm_automations')->where('id', $id)->exists(), 404);
        return $this->runsQuery()->where('r.automation_id', $id)->orderByDesc('r.id')->limit(100)->get()->map(fn ($run) => $this->formatRun($run));
    }

    public function activity(Request $request)
    {
        $data = $request->validate(['automation_id' => 'nullable|integer|exists:crm_automations,id', 'status' => 'nullable|in:pending,completed,failed,skipped', 'search' => 'nullable|string|max:190', 'from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d'.($request->filled('from') ? '|after_or_equal:from' : '')]);
        return $this->runsQuery()
            ->when($data['automation_id'] ?? null, fn ($query, $id) => $query->where('r.automation_id', $id))
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('r.status', $status))
            ->when($data['search'] ?? null, fn ($query, $search) => $query->where(fn ($inner) => $inner->where('c.name', 'like', "%$search%")->orWhere('c.email', 'like', "%$search%")->orWhere('a.name', 'like', "%$search%")))
            ->when($data['from'] ?? null, fn ($query, $from) => $query->where('r.created_at', '>=', $from.' 00:00:00'))
            ->when($data['to'] ?? null, fn ($query, $to) => $query->where('r.created_at', '<=', $to.' 23:59:59'))
            ->orderByDesc('r.id')->paginate(25)->through(fn ($run) => $this->formatRun($run));
    }

    public function contacts(Request $request)
    {
        $data = $request->validate(['search' => 'nullable|string|max:190']);
        return DB::table('crm_contacts')->select('id', 'name', 'email', 'stage', 'subscription_status')
            ->when($data['search'] ?? null, fn ($query, $search) => $query->where(fn ($inner) => $inner->where('name', 'like', "%$search%")->orWhere('email', 'like', "%$search%")))
            ->orderBy('name')->limit(20)->get();
    }

    public function preview(Request $request, CrmAutomationService $service)
    {
        $contact = $request->validate(['contact_id' => 'required|integer|exists:crm_contacts,id']);
        $data = $this->validated($request);
        return $service->preview((object) $data, $contact['contact_id']);
    }

    public function retry(int $id, int $run, CrmAutomationService $service)
    {
        $service->retry($id, $run);
        return $this->formatRun($this->runsQuery()->where('r.id', $run)->first());
    }
}
