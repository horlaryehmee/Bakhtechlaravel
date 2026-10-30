<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CrmAutomationService;
use App\Services\CrmEmailTrackingService;
use App\Services\CrmEmailProgramService;
use App\Services\CrmSegmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Throwable;

class CrmMarketingController extends Controller
{
    public function trackEmailOpen(Request $request, string $token, CrmEmailTrackingService $tracking)
    {
        if (!$request->isMethod('HEAD')) $tracking->record($token);
        return response(base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), 200, [
            'Content-Type' => 'image/gif',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0, private',
            'Pragma' => 'no-cache', 'Expires' => '0',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function savedSegments(CrmSegmentService $segments)
    {
        return DB::table('crm_saved_segments')->orderBy('name')->get()->map(function ($row) use ($segments) {
            $row->filters = json_decode($row->filters, true) ?: [];
            $row->contacts = $segments->apply(DB::table('crm_contacts'), $row->filters)->count();
            return $row;
        });
    }

    public function saveSavedSegment(Request $request, ?int $id = null)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120', 'description' => 'nullable|string|max:1000',
            'filters' => 'present|array',
            'filters.stage' => 'nullable|in:new,contacted,qualified,proposal,negotiation,won,lost',
            'filters.subscription_status' => 'nullable|in:subscribed,unsubscribed',
            'filters.source' => 'nullable|string|max:40',
            'filters.segment_id' => 'nullable|integer|exists:crm_segments,id',
            'filters.search' => 'nullable|string|max:190',
        ]);
        if (DB::table('crm_saved_segments')->where('name', $data['name'])->when($id, fn ($q) => $q->where('id', '!=', $id))->exists()) {
            return response()->json(['message' => 'A segment with this name already exists.'], 422);
        }
        $data['filters'] = json_encode($data['filters'] ?? []);
        if ($id) {
            abort_unless(DB::table('crm_saved_segments')->where('id', $id)->exists(), 404);
            DB::table('crm_saved_segments')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        } else $id = DB::table('crm_saved_segments')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        return DB::table('crm_saved_segments')->find($id);
    }

    public function deleteSavedSegment(int $id)
    {
        abort_unless(DB::table('crm_saved_segments')->where('id', $id)->delete(), 404);
        return response()->noContent();
    }

    public function dashboard(Request $request)
    {
        $validated = $request->validate([
            'start' => 'nullable|date_format:Y-m-d',
            'end' => 'nullable|date_format:Y-m-d|after_or_equal:start',
        ]);
        $end = isset($validated['end']) ? \Illuminate\Support\Carbon::parse($validated['end'])->startOfDay() : today();
        $start = isset($validated['start']) ? \Illuminate\Support\Carbon::parse($validated['start'])->startOfDay() : $end->copy()->subDays(6);
        abort_if($start->gt($end) || $start->diffInDays($end) > 365, 422, 'Choose a date range of up to one year.');
        $days = (int) $start->diffInDays($end) + 1;
        $newByDate = DB::table('crm_contacts')->whereBetween('created_at', [$start, $end->copy()->endOfDay()])
            ->selectRaw('date(created_at) as day, count(*) as total')->groupByRaw('date(created_at)')->pluck('total', 'day');
        $running = DB::table('crm_contacts')->where('created_at', '<', $start)->count();
        $growth = [];
        for ($offset = 0; $offset < $days; $offset++) {
            $date = $start->copy()->addDays($offset);
            $new = (int) ($newByDate[$date->toDateString()] ?? 0);
            $running += $new;
            $growth[] = ['date' => $date->toDateString(), 'new' => $new, 'cumulative' => $running];
        }
        $deliveries = DB::table('crm_campaign_deliveries')->whereBetween('created_at', [$start, $end->copy()->endOfDay()])
            ->select('status')->selectRaw('count(*) as total')->groupBy('status')->pluck('total', 'status');
        $sentInRange = DB::table('crm_campaign_deliveries')->where('status', 'sent')
            ->whereBetween('sent_at', [$start, $end->copy()->endOfDay()]);
        $tracked = (clone $sentInRange)->whereNotNull('tracked_at')->count();
        $opened = (clone $sentInRange)->whereNotNull('tracked_at')->whereNotNull('opened_at')->count();
        return response()->json([
            'engagement' => [
                'sent' => (clone $sentInRange)->count(), 'tracked' => $tracked, 'opened' => $opened,
                'openRate' => $tracked ? round($opened * 100 / $tracked, 1) : null,
                'opens' => (int) (clone $sentInRange)->sum('open_count'),
            ],
            'recentOpens' => DB::table('crm_campaign_deliveries as d')
                ->join('crm_contacts as c', 'c.id', '=', 'd.contact_id')
                ->join('crm_campaigns as m', 'm.id', '=', 'd.campaign_id')
                ->where('d.status', 'sent')->whereBetween('d.last_opened_at', [$start, $end->copy()->endOfDay()])
                ->select('d.id', 'd.contact_id', 'c.name', 'c.email', 'm.name as campaign', 'm.subject', 'd.opened_at', 'd.last_opened_at', 'd.open_count')
                ->orderByDesc('d.last_opened_at')->limit(8)->get(),
            'upcomingTasks' => DB::table('crm_tasks')->where('completed', false)->whereNotNull('due_at')->orderBy('due_at')->limit(4)->get(['id', 'title', 'due_at']),
            'overdueTasks' => DB::table('crm_tasks')->where('completed', false)->where('due_at', '<', now())->count(),
            'activeContacts' => DB::table('crm_contacts')->where('subscription_status', 'subscribed')->count(),
            'campaigns' => DB::table('crm_campaigns')->count(),
            'emailsSent' => DB::table('crm_campaign_deliveries')->where('status', 'sent')->count(),
            'activeAutomations' => DB::table('crm_automations')->where('enabled', true)->count(),
            'totalContacts' => DB::table('crm_contacts')->count(),
            'openDeals' => DB::table('crm_deals')->whereNotIn('stage', ['won', 'lost'])->count(),
            'activeProjects' => DB::table('crm_projects')->whereIn('status', ['planned', 'active', 'on_hold'])->count(),
            'openTasks' => DB::table('crm_tasks')->where('completed', false)->count(),
            'tags' => DB::table('crm_segments')->where('kind', 'tag')->count(),
            'lists' => DB::table('crm_segments')->where('kind', 'list')->count(),
            'growth' => $growth,
            'performance' => [
                'sent' => (int) ($deliveries['sent'] ?? 0),
                'pending' => (int) ($deliveries['pending'] ?? 0) + (int) ($deliveries['processing'] ?? 0),
                'failed' => (int) ($deliveries['failed'] ?? 0),
                'skipped' => (int) ($deliveries['skipped'] ?? 0),
            ],
            'recentCampaigns' => DB::table('crm_campaigns')->select('id', 'name', 'subject', 'status', 'created_at', 'sent_at')->orderByDesc('id')->limit(5)->get(),
            'recentContacts' => DB::table('crm_contacts')->select('id', 'name', 'email', 'subscription_status', 'created_at')->orderByDesc('id')->limit(5)->get(),
            'recentAutomations' => DB::table('crm_automations')->where('enabled', true)->select('id', 'name', 'trigger_type', 'action_type')->orderByDesc('id')->limit(5)->get(),
        ]);
    }

    public function automations()
    {
        return DB::table('crm_automations as a')->leftJoin('crm_segments as s', 's.id', '=', 'a.segment_id')
            ->select('a.*', 's.name as segment_name')
            ->selectSub(DB::table('crm_automation_runs as r')->whereColumn('r.automation_id', 'a.id')->selectRaw('count(*)'), 'run_count')
            ->orderByDesc('a.id')->get();
    }

    public function automationRuns(int $id)
    {
        abort_unless(DB::table('crm_automations')->where('id', $id)->exists(), 404);
        return DB::table('crm_automation_runs as r')->join('crm_contacts as c', 'c.id', '=', 'r.contact_id')
            ->where('r.automation_id', $id)->select('r.id', 'r.event_key', 'r.created_at', 'c.id as contact_id', 'c.name', 'c.email')
            ->orderByDesc('r.id')->limit(100)->get();
    }

    public function duplicateAutomation(int $id)
    {
        $source = DB::table('crm_automations')->find($id);
        abort_unless($source, 404);
        $newId = DB::table('crm_automations')->insertGetId([
            'name' => Str::limit($source->name.' (copy)', 190), 'enabled' => false,
            'trigger_type' => $source->trigger_type, 'trigger_stage' => $source->trigger_stage,
            'action_type' => $source->action_type, 'segment_id' => $source->segment_id,
            'task_title' => $source->task_title, 'task_due_days' => $source->task_due_days,
            'steps_json' => $source->steps_json,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return DB::table('crm_automations')->find($newId);
    }

    public function deleteAutomation(int $id)
    {
        abort_unless(DB::table('crm_automations')->where('id', $id)->delete(), 404);
        return response()->noContent();
    }

    public function saveAutomation(Request $request, ?int $id = null)
    {
        $data = $request->validate([
            'name' => 'required|string|max:190', 'enabled' => 'required|boolean',
            'trigger_type' => 'required|in:contact_created,stage_changed',
            'trigger_stage' => 'nullable|in:new,contacted,qualified,proposal,negotiation,won,lost',
            'action_type' => 'required|in:segment,task', 'segment_id' => 'nullable|required_if:action_type,segment|exists:crm_segments,id',
            'task_title' => 'nullable|required_if:action_type,task|string|max:190', 'task_due_days' => 'nullable|integer|min:0|max:365',
            'steps' => 'sometimes|array|min:1|max:20',
            'steps.*.action_type' => 'required|in:segment,task',
            'steps.*.segment_id' => 'nullable|integer|exists:crm_segments,id',
            'steps.*.task_title' => 'nullable|string|max:190',
            'steps.*.task_due_days' => 'nullable|integer|min:0|max:365',
        ]);
        if (isset($data['steps'])) {
            foreach ($data['steps'] as $index => $step) {
                if ($step['action_type'] === 'segment' && empty($step['segment_id'])) {
                    throw \Illuminate\Validation\ValidationException::withMessages(["steps.$index.segment_id" => 'Choose a list or tag for every audience step.']);
                }
                if ($step['action_type'] === 'task' && empty(trim($step['task_title'] ?? ''))) {
                    throw \Illuminate\Validation\ValidationException::withMessages(["steps.$index.task_title" => 'Enter a title for every task step.']);
                }
            }
            $data['steps_json'] = json_encode($data['steps']);
            unset($data['steps']);
        }
        if ($id) { abort_unless(DB::table('crm_automations')->where('id', $id)->exists(), 404); DB::table('crm_automations')->where('id', $id)->update(array_merge($data, ['updated_at' => now()])); }
        else $id = DB::table('crm_automations')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        return DB::table('crm_automations')->find($id);
    }

    public function unsubscribe(int $contact)
    {
        $previous = DB::table('crm_contacts')->find($contact);
        DB::table('crm_contacts')->where('id', $contact)->update(['subscription_status' => 'unsubscribed', 'subscribed_at' => null, 'updated_at' => now()]);
        if ($previous && $previous->subscription_status !== 'unsubscribed') app(CrmAutomationService::class)->run($contact, 'subscription_changed', null, null, ['subscription_status' => 'unsubscribed']);
        return response('You have been unsubscribed from Bakhtech marketing emails.', 200)->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    public function importContacts(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:5120']);
        $handle = fopen($request->file('file')->getRealPath(), 'r');
        $header = array_map(fn ($value) => strtolower(trim((string) $value)), fgetcsv($handle) ?: []);
        if (!in_array('email', $header, true) || !in_array('name', $header, true)) {
            fclose($handle);
            return response()->json(['message' => 'CSV needs name and email columns.'], 422);
        }
        $created = 0; $updated = 0; $skipped = 0;
        while (($values = fgetcsv($handle)) !== false) {
            $row = array_combine($header, array_pad(array_slice($values, 0, count($header)), count($header), ''));
            $email = strtolower(trim((string) ($row['email'] ?? '')));
            $name = trim((string) ($row['name'] ?? ''));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $name === '') { $skipped++; continue; }
            $existing = DB::table('crm_contacts')->where('email', $email)->first();
            if ($existing) {
                DB::table('crm_contacts')->where('id', $existing->id)->update([
                    'name' => $name, 'phone' => trim((string) ($row['phone'] ?? '')) ?: $existing->phone,
                    'company' => trim((string) ($row['company'] ?? '')) ?: $existing->company,
                    'updated_at' => now(),
                ]);
                $updated++;
            } else {
                DB::table('crm_contacts')->insert([
                    'email' => $email, 'name' => $name, 'phone' => trim((string) ($row['phone'] ?? '')) ?: null,
                    'company' => trim((string) ($row['company'] ?? '')) ?: null,
                    'source' => trim((string) ($row['source'] ?? '')) ?: 'import',
                    'subscription_status' => 'unsubscribed', 'stage' => 'new',
                    'created_at' => now(), 'updated_at' => now(),
                ]);
                $createdId = DB::table('crm_contacts')->where('email', $email)->value('id');
                app(CrmAutomationService::class)->run($createdId, 'contact_created');
                $created++;
            }
        }
        fclose($handle);
        return response()->json(compact('created', 'updated', 'skipped'));
    }

    public function segments()
    {
        return DB::table('crm_segments as s')->leftJoin('crm_contact_segments as cs', 'cs.segment_id', '=', 's.id')
            ->select('s.id', 's.kind', 's.name', 's.color')->selectRaw('count(cs.contact_id) as contacts')
            ->groupBy('s.id', 's.kind', 's.name', 's.color')->orderBy('s.kind')->orderBy('s.name')->get();
    }

    public function saveSegment(Request $request, ?int $id = null)
    {
        $data = $request->validate(['kind' => 'required|in:list,tag', 'name' => 'required|string|max:120', 'color' => 'nullable|string|max:20']);
        if (DB::table('crm_segments')->where('kind', $data['kind'])->where('name', $data['name'])->when($id, fn ($q) => $q->where('id', '!=', $id))->exists()) return response()->json(['message' => 'This list or tag already exists.'], 422);
        if ($id) { abort_unless(DB::table('crm_segments')->where('id', $id)->exists(), 404); DB::table('crm_segments')->where('id', $id)->update(array_merge($data, ['updated_at' => now()])); }
        else $id = DB::table('crm_segments')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        return DB::table('crm_segments')->find($id);
    }

    public function contactSegments(int $id)
    {
        abort_unless(DB::table('crm_contacts')->where('id', $id)->exists(), 404);
        return DB::table('crm_segments as s')->join('crm_contact_segments as cs', 'cs.segment_id', '=', 's.id')->where('cs.contact_id', $id)->select('s.*')->get();
    }

    public function updateContactSegments(Request $request, int $id)
    {
        abort_unless(DB::table('crm_contacts')->where('id', $id)->exists(), 404);
        $data = $request->validate(['segment_ids' => 'present|array', 'segment_ids.*' => 'integer|distinct|exists:crm_segments,id']);
        $added = DB::transaction(function () use ($id, $data) {
            DB::table('crm_contacts')->where('id', $id)->lockForUpdate()->first();
            $previous = DB::table('crm_contact_segments')->where('contact_id', $id)->pluck('segment_id')->all();
            DB::table('crm_contact_segments')->where('contact_id', $id)->delete();
            foreach ($data['segment_ids'] as $segmentId) DB::table('crm_contact_segments')->insert(['contact_id' => $id, 'segment_id' => $segmentId]);
            return array_diff($data['segment_ids'], $previous);
        });
        foreach ($added as $segmentId) app(CrmAutomationService::class)->run($id, 'segment_added', null, null, ['segment_id' => (int) $segmentId]);
        app(CrmEmailProgramService::class)->enrollContact($id);
        return $this->contactSegments($id);
    }

    public function subscription(Request $request, int $id)
    {
        $previous = DB::table('crm_contacts')->find($id);
        abort_unless($previous, 404);
        $data = $request->validate(['status' => 'required|in:subscribed,unsubscribed']);
        DB::table('crm_contacts')->where('id', $id)->update([
            'subscription_status' => $data['status'],
            'subscribed_at' => $data['status'] === 'subscribed' ? now() : null,
            'updated_at' => now(),
        ]);
        if ($previous->subscription_status !== $data['status']) app(CrmAutomationService::class)->run($id, 'subscription_changed', null, null, ['subscription_status' => $data['status']]);
        if ($data['status'] === 'subscribed') app(CrmEmailProgramService::class)->enrollContact($id);
        return DB::table('crm_contacts')->find($id);
    }

    public function campaigns()
    {
        return DB::table('crm_campaigns as c')->leftJoin('crm_segments as s', 's.id', '=', 'c.segment_id')
            ->select('c.*', 's.name as segment_name')
            ->selectSub(DB::table('crm_campaign_deliveries as d')->selectRaw('count(*)')->whereColumn('d.campaign_id', 'c.id'), 'recipients')
            ->selectSub(DB::table('crm_campaign_deliveries as d')->selectRaw('count(*)')->whereColumn('d.campaign_id', 'c.id')->where('d.status', 'sent'), 'sent_count')
            ->selectSub(DB::table('crm_campaign_deliveries as d')->selectRaw('count(*)')->whereColumn('d.campaign_id', 'c.id')->where('d.status', 'failed'), 'failed_count')
            ->selectSub(DB::table('crm_campaign_deliveries as d')->selectRaw('count(*)')->whereColumn('d.campaign_id', 'c.id')->whereIn('d.status', ['pending', 'processing']), 'pending_count')
            ->selectSub(DB::table('crm_campaign_deliveries as d')->selectRaw('count(*)')->whereColumn('d.campaign_id', 'c.id')->where('d.status', 'sent')->whereNotNull('d.opened_at'), 'opened_count')
            ->selectSub(DB::table('crm_campaign_deliveries as d')->selectRaw('count(*)')->whereColumn('d.campaign_id', 'c.id')->where('d.status', 'sent')->whereNotNull('d.tracked_at'), 'tracked_count')
            ->orderByDesc('c.id')->get();
    }

    private function campaignAudienceContacts(?int $segmentId)
    {
        return DB::table('crm_contacts')
            ->when($segmentId, fn ($query) => $query->whereIn('id', DB::table('crm_contact_segments')->where('segment_id', $segmentId)->select('contact_id')))
            ->select('id', 'name', 'email', 'subscription_status')->orderBy('name')->get();
    }

    public function campaignAudience(Request $request)
    {
        $data = $request->validate(['segment_id' => 'nullable|integer|exists:crm_segments,id']);
        $contacts = $this->campaignAudienceContacts($data['segment_id'] ?? null);
        $subscribed = $contacts->where('subscription_status', 'subscribed');
        $eligible = $subscribed->filter(fn ($contact) => filter_var($contact->email, FILTER_VALIDATE_EMAIL));
        return response()->json([
            'total' => $contacts->count(), 'eligible' => $eligible->count(),
            'unsubscribed' => $contacts->count() - $subscribed->count(),
            'invalidEmail' => $subscribed->count() - $eligible->count(),
            'sample' => $eligible->take(5)->values(),
            'sender' => ['name' => config('mail.from.name'), 'email' => config('mail.from.address')],
        ]);
    }

    private function filterDeliveryStatus($query, string $status)
    {
        if ($status === 'opened') return $query->where('d.status', 'sent')->whereNotNull('d.opened_at');
        if ($status === 'unopened') return $query->where('d.status', 'sent')->whereNotNull('d.tracked_at')->whereNull('d.opened_at');
        return $query->where('d.status', $status);
    }

    public function campaignDeliveries(Request $request, int $id)
    {
        abort_unless(DB::table('crm_campaigns')->where('id', $id)->exists(), 404);
        $data = $request->validate(['status' => 'nullable|in:pending,processing,sent,failed,skipped,opened,unopened', 'search' => 'nullable|string|max:190']);
        return DB::table('crm_campaign_deliveries as d')->join('crm_contacts as c', 'c.id', '=', 'd.contact_id')
            ->where('d.campaign_id', $id)
            ->when($data['status'] ?? null, fn ($query, $status) => $this->filterDeliveryStatus($query, $status))
            ->when($data['search'] ?? null, fn ($query, $search) => $query->where(fn ($inner) => $inner->where('c.name', 'like', "%{$search}%")->orWhere('c.email', 'like', "%{$search}%")))
            ->select('d.id', 'd.status', 'd.error', 'd.sent_at', 'd.tracked_at', 'd.opened_at', 'd.last_opened_at', 'd.open_count', 'c.name', 'c.email')->orderByDesc('d.id')->paginate(25);
    }

    public function emailAssets(Request $request)
    {
        $kind = $request->validate(['kind' => 'required|in:template,pattern'])['kind'];
        return DB::table('crm_email_assets')->where('kind', $kind)->orderByDesc('updated_at')->get();
    }

    public function saveEmailAsset(Request $request, ?int $id = null)
    {
        $data = $request->validate(['kind' => 'required|in:template,pattern', 'name' => 'required|string|max:160', 'subject' => 'nullable|string|max:190', 'body' => 'required|string|max:100000']);
        $data['subject'] = $data['subject'] ?? '';
        if ($id) {
            abort_unless(DB::table('crm_email_assets')->where('id', $id)->where('kind', $data['kind'])->exists(), 404);
            DB::table('crm_email_assets')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        } else {
            $id = DB::table('crm_email_assets')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        }
        return DB::table('crm_email_assets')->find($id);
    }

    public function deleteEmailAsset(int $id)
    {
        abort_unless(DB::table('crm_email_assets')->where('id', $id)->delete(), 404);
        return response()->noContent();
    }

    public function emailActivities(Request $request)
    {
        $data = $request->validate([
            'start' => 'nullable|date_format:Y-m-d',
            'end' => 'nullable|date_format:Y-m-d'.($request->filled('start') ? '|after_or_equal:start' : ''),
            'page' => 'nullable|integer|min:1', 'per_page' => 'nullable|integer|min:10|max:100',
            'search' => 'nullable|string|max:190', 'status' => 'nullable|in:sent,pending,processing,failed,skipped,opened,unopened',
        ]);
        $query = DB::table('crm_campaign_deliveries as d')
            ->join('crm_campaigns as c', 'c.id', '=', 'd.campaign_id')
            ->join('crm_contacts as contact', 'contact.id', '=', 'd.contact_id')
            ->when($data['start'] ?? null, fn ($q, $date) => $q->where('d.created_at', '>=', $date.' 00:00:00'))
            ->when($data['end'] ?? null, fn ($q, $date) => $q->where('d.created_at', '<=', $date.' 23:59:59'))
            ->when($data['search'] ?? null, fn ($q, $search) => $q->where(fn ($inner) => $inner->where('c.name', 'like', "%$search%")->orWhere('contact.name', 'like', "%$search%")->orWhere('contact.email', 'like', "%$search%")))
            ->when($data['status'] ?? null, fn ($q, $status) => $this->filterDeliveryStatus($q, $status));
        $counts = $request->has('page') ? (clone $query)->select('d.status')->selectRaw('count(*) as total')->groupBy('d.status')->pluck('total', 'status') : [];
        if ($request->has('page')) $counts['opened'] = (clone $query)->where('d.status', 'sent')->whereNotNull('d.opened_at')->count();
        $query->select('d.id', 'd.contact_id', 'd.campaign_id', 'd.status', 'd.sent_at', 'd.tracked_at', 'd.opened_at', 'd.last_opened_at', 'd.open_count', 'd.error', 'd.created_at', 'c.name as campaign', 'contact.name as contact', 'contact.email')->orderByDesc('d.id');
        if (!$request->has('page')) return $query->limit(200)->get();
        $result = $query->paginate($data['per_page'] ?? 25)->toArray();
        $result['counts'] = $counts;
        return response()->json($result);
    }

    public function duplicateCampaign(int $id)
    {
        $source = DB::table('crm_campaigns')->find($id);
        abort_unless($source, 404);
        $copy = DB::table('crm_campaigns')->insertGetId([
            'name' => Str::limit($source->name.' (copy)', 190),
            'subject' => $source->subject, 'body' => $source->body, 'editor_type' => $source->editor_type,
            'segment_id' => $source->segment_id, 'status' => 'draft',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return DB::table('crm_campaigns')->find($copy);
    }

    public function deleteCampaign(int $id)
    {
        $campaign = DB::table('crm_campaigns')->find($id);
        abort_unless($campaign, 404);
        if (in_array($campaign->status, ['sending'], true)) {
            return response()->json(['message' => 'A campaign being sent cannot be deleted.'], 422);
        }
        DB::table('crm_campaigns')->where('id', $id)->delete();
        return response()->noContent();
    }

    public function saveCampaign(Request $request, ?int $id = null)
    {
        $data = $request->validate(['name' => 'required|string|max:160', 'subject' => 'nullable|string|max:190', 'body' => 'nullable|string|max:100000', 'segment_id' => 'nullable|exists:crm_segments,id', 'editor_type' => 'sometimes|in:default,classic,html,visual']);
        $data['subject'] = $data['subject'] ?? '';
        $data['body'] = $data['body'] ?? '';
        if ($id) {
            $campaign = DB::table('crm_campaigns')->find($id);
            abort_unless($campaign, 404);
            if ($campaign->status !== 'draft') return response()->json(['message' => 'Only draft campaigns can be edited.'], 422);
            DB::table('crm_campaigns')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        } else $id = DB::table('crm_campaigns')->insertGetId(array_merge($data, ['status' => 'draft', 'created_at' => now(), 'updated_at' => now()]));
        return DB::table('crm_campaigns')->find($id);
    }

    public function campaign(int $id)
    {
        $campaign = DB::table('crm_campaigns')->find($id);
        abort_unless($campaign, 404);
        return response()->json([
            'campaign' => $campaign,
            'counts' => DB::table('crm_campaign_deliveries')->where('campaign_id', $id)->select('status')->selectRaw('count(*) as total')->groupBy('status')->pluck('total', 'status'),
            'deliveries' => DB::table('crm_campaign_deliveries as d')->join('crm_contacts as c', 'c.id', '=', 'd.contact_id')
                ->where('d.campaign_id', $id)->select('d.id', 'd.status', 'd.error', 'd.sent_at', 'd.tracked_at', 'd.opened_at', 'd.last_opened_at', 'd.open_count', 'c.name', 'c.email')->orderByDesc('d.id')->limit(100)->get(),
        ]);
    }

    public function launch(int $id)
    {
        $campaign = DB::table('crm_campaigns')->find($id);
        abort_unless($campaign, 404);
        if ($campaign->status !== 'draft') return response()->json(['message' => 'Campaign has already been launched.'], 422);
        if (! trim($campaign->subject) || ! trim($campaign->body)) return response()->json(['message' => 'Add a subject and email body before preparing the audience.'], 422);
        $ids = $this->campaignAudienceContacts($campaign->segment_id)->filter(fn ($contact) => $contact->subscription_status === 'subscribed' && filter_var($contact->email, FILTER_VALIDATE_EMAIL))->pluck('id');
        if ($ids->isEmpty()) return response()->json(['message' => 'No subscribed contacts in this audience.'], 422);
        DB::transaction(function () use ($campaign, $ids) {
            foreach ($ids as $contactId) DB::table('crm_campaign_deliveries')->insert([
                'campaign_id' => $campaign->id, 'contact_id' => $contactId, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('crm_campaigns')->where('id', $campaign->id)->update(['status' => 'sending', 'updated_at' => now()]);
        });
        return $this->campaign($id);
    }

    public function sendBatch(int $id)
    {
        $campaign = DB::table('crm_campaigns')->find($id);
        abort_unless($campaign, 404);
        if ($campaign->status !== 'sending') return response()->json(['message' => 'Campaign is not ready to send.'], 422);
        $deliveries = DB::table('crm_campaign_deliveries as d')->join('crm_contacts as c', 'c.id', '=', 'd.contact_id')
            ->where('d.campaign_id', $id)->where('d.status', 'pending')->select('d.id', 'd.contact_id', 'c.email', 'c.name', 'c.subscription_status')->limit(20)->get();
        foreach ($deliveries as $delivery) {
            if ($delivery->subscription_status !== 'subscribed' || !filter_var($delivery->email, FILTER_VALIDATE_EMAIL)) {
                DB::table('crm_campaign_deliveries')->where('id', $delivery->id)->update(['status' => 'skipped', 'updated_at' => now()]);
                continue;
            }
            $reserved = DB::table('crm_campaign_deliveries')->where('id', $delivery->id)->where('status', 'pending')->update(['status' => 'processing', 'updated_at' => now()]);
            if (!$reserved) continue;
            $replacements = ['{{name}}' => $delivery->name, '{{email}}' => $delivery->email];
            try {
                $unsubscribe = URL::temporarySignedRoute('crm.unsubscribe', now()->addYears(2), ['contact' => $delivery->contact_id]);
                $message = function ($mail) use ($delivery, $campaign, $replacements) {
                    $mail->to($delivery->email, $delivery->name)->subject(strtr($campaign->subject, $replacements));
                };
                if (in_array($campaign->editor_type, ['default', 'html', 'visual'], true)) {
                    $safeReplacements = array_map(fn ($value) => e($value), $replacements);
                    Mail::html(app(CrmEmailTrackingService::class)->instrument($delivery->id, strtr($campaign->body, $safeReplacements).'<p><a href="'.e($unsubscribe).'">Unsubscribe</a></p>'), $message);
                } else {
                    $plain = strtr($campaign->body, $replacements)."\n\nUnsubscribe: {$unsubscribe}";
                    $html = '<div style="white-space:pre-wrap;font-family:Arial,sans-serif">'.nl2br(e($plain)).'</div>';
                    Mail::html(app(CrmEmailTrackingService::class)->instrument($delivery->id, $html), function ($mail) use ($message, $plain) {
                        $message($mail);
                        $mail->getSymfonyMessage()->text($plain);
                    });
                }
                DB::table('crm_campaign_deliveries')->where('id', $delivery->id)->update(['status' => 'sent', 'sent_at' => now(), 'updated_at' => now()]);
                DB::table('crm_activities')->insert(['contact_id' => $delivery->contact_id, 'type' => 'email', 'subject' => $campaign->subject, 'source_type' => 'campaign', 'source_id' => $delivery->id, 'created_at' => now(), 'updated_at' => now()]);
            } catch (Throwable $e) {
                report($e);
                DB::table('crm_campaign_deliveries')->where('id', $delivery->id)->update(['status' => 'failed', 'error' => Str::limit($e->getMessage(), 500), 'updated_at' => now()]);
            }
        }
        if (!DB::table('crm_campaign_deliveries')->where('campaign_id', $id)->whereIn('status', ['pending', 'processing'])->exists()) {
            DB::table('crm_campaigns')->where('id', $id)->update(['status' => 'sent', 'sent_at' => now(), 'updated_at' => now()]);
        }
        return $this->campaign($id);
    }
}
