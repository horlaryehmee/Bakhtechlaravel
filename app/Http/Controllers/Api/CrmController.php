<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CrmAutomationService;
use App\Services\CrmSegmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CrmController extends Controller
{
    private const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

    public function index(Request $request)
    {
        $this->syncSources();
        $query = DB::table('crm_contacts');
        if ($search = trim((string) $request->query('search', ''))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('company', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        if (in_array($request->query('stage'), self::STAGES, true)) {
            $query->where('stage', $request->query('stage'));
        }
        if ($request->filled('segment_id')) {
            $segmentId = (int) $request->query('segment_id');
            $query->whereIn('id', DB::table('crm_contact_segments')->where('segment_id', $segmentId)->select('contact_id'));
        }
        if (in_array($request->query('form_source'), ['message', 'quote', 'booking'], true)) {
            $query->whereIn('id', DB::table('crm_activities')->where('source_type', $request->query('form_source'))->select('contact_id'));
        }
        if (in_array($request->query('subscription'), ['subscribed', 'unsubscribed'], true)) {
            $query->where('subscription_status', $request->query('subscription'));
        }
        if ($request->filled('saved_segment_id')) {
            $saved = DB::table('crm_saved_segments')->find((int) $request->query('saved_segment_id'));
            abort_unless($saved, 404);
            app(CrmSegmentService::class)->apply($query, json_decode($saved->filters, true) ?: []);
        }
        $sort = $request->query('sort') === 'name' ? 'name' : 'last_interaction_at';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $contacts = $query->orderBy($sort, $direction)->orderByDesc('id')->paginate(30);
        $ids = collect($contacts->items())->pluck('id');
        $assigned = DB::table('crm_contact_segments as cs')
            ->join('crm_segments as s', 's.id', '=', 'cs.segment_id')
            ->whereIn('cs.contact_id', $ids)
            ->select('cs.contact_id', 's.id', 's.name', 's.kind')
            ->get()->groupBy('contact_id');
        $contacts->getCollection()->transform(function ($contact) use ($assigned) {
            $contact->segments = $assigned->get($contact->id, collect())->values();
            return $contact;
        });
        return response()->json([
            'contacts' => $contacts,
            'stages' => DB::table('crm_contacts')->select('stage')->selectRaw('count(*) as total')->groupBy('stage')->pluck('total', 'stage'),
            'openTasks' => DB::table('crm_tasks')->where('completed', false)->count(),
        ]);
    }

    public function show(int $id)
    {
        $this->syncSources();
        $contact = DB::table('crm_contacts')->find($id);
        abort_unless($contact, 404);
        return response()->json([
            'contact' => $contact,
            'owner' => $contact->owner_id ? DB::table('admins')->where('id', $contact->owner_id)->first(['id', 'name']) : null,
            'company' => $contact->company_id ? DB::table('crm_companies')->find($contact->company_id) : null,
            'segments' => DB::table('crm_segments as s')->join('crm_contact_segments as cs', 'cs.segment_id', '=', 's.id')
                ->where('cs.contact_id', $id)->select('s.id', 's.kind', 's.name', 's.color')->orderBy('s.name')->get(),
            'emailHistory' => DB::table('crm_campaign_deliveries as d')->join('crm_campaigns as c', 'c.id', '=', 'd.campaign_id')
                ->where('d.contact_id', $id)->select('d.id', 'c.name as campaign', 'c.subject', 'd.status', 'd.error', 'd.sent_at', 'd.tracked_at', 'd.opened_at', 'd.last_opened_at', 'd.open_count', 'd.created_at')
                ->orderByDesc('d.id')->limit(100)->get(),
            'activities' => DB::table('crm_activities')->where('contact_id', $id)->orderByDesc('created_at')->orderByDesc('id')->limit(100)->get(),
            'tasks' => DB::table('crm_tasks')->where('contact_id', $id)->orderBy('completed')->orderBy('due_at')->get(),
            'deals' => DB::table('crm_deals')->where('contact_id', $id)->orderByDesc('id')->get(),
            'projects' => DB::table('crm_projects')->where('contact_id', $id)->orderByDesc('id')->get(),
            'documents' => DB::table('invoice_documents as d')->join('invoice_clients as c', 'c.id', '=', 'd.client_id')
                ->whereRaw('1 = ?', [empty($contact->email) ? 0 : 1])
                ->whereRaw('lower(c.email) = ?', [strtolower((string) $contact->email)])
                ->select('d.id', 'd.number', 'd.type', 'd.status', 'd.total', 'd.amount_paid', 'd.balance_due', 'd.currency', 'd.due_date', 'd.created_at', 'd.public_token')->orderByDesc('d.id')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:190', 'email' => 'nullable|email|max:190',
            'phone' => 'nullable|string|max:60', 'company' => 'nullable|string|max:190',
            'stage' => 'nullable|in:new,contacted,qualified,proposal,negotiation,won,lost', 'notes' => 'nullable|string|max:10000',
            'service_interest' => 'nullable|string|max:190', 'owner_id' => 'nullable|exists:admins,id', 'source' => 'nullable|string|max:40',
        ]);
        $data['email'] = strtolower(trim($data['email'] ?? '')) ?: null;
        if ($data['email'] && DB::table('crm_contacts')->where('email', $data['email'])->exists()) {
            return response()->json(['message' => 'A contact with this email already exists.'], 422);
        }
        $id = DB::table('crm_contacts')->insertGetId(array_merge(['source' => 'manual'], $data, ['created_at' => now(), 'updated_at' => now()]));
        app(CrmAutomationService::class)->run($id, 'contact_created');
        return $this->show($id);
    }

    public function update(Request $request, int $id)
    {
        $previous = DB::table('crm_contacts')->where('id', $id)->first();
        abort_unless($previous, 404);
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:190', 'email' => 'nullable|email|max:190',
            'phone' => 'nullable|string|max:60', 'company' => 'nullable|string|max:190',
            'stage' => 'sometimes|in:new,contacted,qualified,proposal,negotiation,won,lost', 'notes' => 'nullable|string|max:10000',
            'service_interest' => 'nullable|string|max:190', 'owner_id' => 'nullable|exists:admins,id', 'source' => 'nullable|string|max:40',
        ]);
        if (array_key_exists('email', $data)) {
            $data['email'] = strtolower(trim($data['email'] ?? '')) ?: null;
            if ($data['email'] && DB::table('crm_contacts')->where('email', $data['email'])->where('id', '!=', $id)->exists()) {
                return response()->json(['message' => 'A contact with this email already exists.'], 422);
            }
        }
        DB::table('crm_contacts')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        if (isset($data['stage']) && $data['stage'] !== $previous->stage) app(CrmAutomationService::class)->run($id, 'stage_changed', $data['stage'], 'stage:'.\Illuminate\Support\Str::uuid());
        return $this->show($id);
    }

    public function activity(Request $request, int $id)
    {
        abort_unless(DB::table('crm_contacts')->where('id', $id)->exists(), 404);
        $data = $request->validate(['type' => 'required|in:note,call,email,meeting', 'subject' => 'required|string|max:190', 'body' => 'nullable|string|max:10000']);
        DB::table('crm_activities')->insert(array_merge($data, ['contact_id' => $id, 'created_at' => now(), 'updated_at' => now()]));
        DB::table('crm_contacts')->where('id', $id)->update(['last_interaction_at' => now(), 'updated_at' => now()]);
        return $this->show($id);
    }

    public function task(Request $request, int $id)
    {
        abort_unless(DB::table('crm_contacts')->where('id', $id)->exists(), 404);
        $data = $request->validate(['title' => 'required|string|max:190', 'due_at' => 'nullable|date', 'priority' => 'nullable|in:low,normal,high', 'owner_id' => 'nullable|exists:admins,id', 'deal_id' => 'nullable|exists:crm_deals,id']);
        if (!empty($data['deal_id']) && !DB::table('crm_deals')->where('id', $data['deal_id'])->where('contact_id', $id)->exists()) abort(422, 'Deal does not belong to this contact.');
        DB::table('crm_tasks')->insert(array_merge($data, ['contact_id' => $id, 'created_at' => now(), 'updated_at' => now()]));
        return $this->show($id);
    }

    public function updateTask(Request $request, int $id)
    {
        abort_unless(DB::table('crm_tasks')->where('id', $id)->exists(), 404);
        $data = $request->validate(['title' => 'sometimes|required|string|max:190', 'completed' => 'sometimes|boolean', 'status' => 'sometimes|in:pending,ongoing,completed', 'priority' => 'sometimes|in:low,normal,high', 'owner_id' => 'nullable|exists:admins,id', 'due_at' => 'nullable|date']);
        if (isset($data['completed'])) $data['status'] = $data['completed'] ? 'completed' : 'pending';
        if (isset($data['status'])) $data['completed'] = $data['status'] === 'completed';
        DB::table('crm_tasks')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        return response()->json(['ok' => true]);
    }

    public function overview()
    {
        $this->syncSources();
        $month = now()->startOfMonth();
        return response()->json([
            'contacts' => DB::table('crm_contacts')->count(),
            'newEnquiries' => DB::table('crm_contacts')->where('created_at', '>=', $month)->count(),
            'clients' => DB::table('crm_contacts')->where('stage', 'won')->count(),
            'dealsWon' => DB::table('crm_deals')->where('stage', 'won')->count(),
            'dealsLost' => DB::table('crm_deals')->where('stage', 'lost')->count(),
            'pipelineValue' => DB::table('crm_deals')->whereNotIn('stage', ['won', 'lost'])->sum('estimated_value'),
            'wonValue' => DB::table('crm_deals')->where('stage', 'won')->sum('agreed_value'),
            'activeProjects' => DB::table('crm_projects')->whereIn('status', ['planned', 'active', 'on_hold'])->count(),
            'overdueTasks' => DB::table('crm_tasks')->where('completed', false)->whereDate('due_at', '<', today())->count(),
            'dueTasks' => DB::table('crm_tasks')->where('completed', false)->whereDate('due_at', '<=', today()->addDays(7))->count(),
            'pendingPayments' => DB::table('invoice_documents')->where('type', 'invoice')->where('balance_due', '>', 0)->sum('balance_due'),
            'revenue' => DB::table('invoice_documents')->where('type', 'invoice')->sum('amount_paid'),
            'outstandingQuotes' => DB::table('invoice_documents')->where('type', 'quote')->whereIn('status', ['sent', 'viewed'])->sum('total'),
            'conversionRate' => round(100 * DB::table('crm_contacts')->where('stage', 'won')->count() / max(1, DB::table('crm_contacts')->count()), 1),
            'lostReasons' => DB::table('crm_deals')->where('stage', 'lost')->whereNotNull('lost_reason')->select('lost_reason')->selectRaw('count(*) as total')->groupBy('lost_reason')->orderByDesc('total')->limit(10)->get(),
            'sources' => DB::table('crm_contacts')->select('source')->selectRaw('count(*) as total')->groupBy('source')->orderByDesc('total')->get(),
            'monthly' => DB::table('crm_deals')->where('stage', 'won')->where('updated_at', '>=', now()->subMonths(12))
                ->selectRaw("substr(updated_at, 1, 7) as month, count(*) as deals, sum(agreed_value) as value")
                ->groupByRaw('substr(updated_at, 1, 7)')->orderBy('month')->get(),
        ]);
    }

    public function forms()
    {
        $this->syncSources();
        $forms = [
            ['id' => 'message', 'title' => 'Contact form', 'path' => '/contact', 'table' => 'contact_messages'],
            ['id' => 'quote', 'title' => 'Quote builder', 'path' => '/quote-builder', 'table' => 'qb_quotes'],
            ['id' => 'booking', 'title' => 'Booking form', 'path' => '/booking', 'table' => 'bookings'],
        ];
        return collect($forms)->map(function ($form) {
            $form['entries'] = Schema::hasTable($form['table']) ? DB::table($form['table'])->count() : 0;
            $form['crm_contacts'] = DB::table('crm_activities')->where('source_type', $form['id'])->distinct('contact_id')->count('contact_id');
            unset($form['table']);
            return $form;
        });
    }

    public function deals()
    {
        $this->syncSources();
        return DB::table('crm_deals as d')->join('crm_contacts as c', 'c.id', '=', 'd.contact_id')
            ->leftJoin('crm_companies as co', 'co.id', '=', 'd.company_id')
            ->select('d.*', 'c.name as contact_name', 'co.name as company_name')->orderByDesc('d.id')->get();
    }

    public function tasks()
    {
        return DB::table('crm_tasks as t')->join('crm_contacts as c', 'c.id', '=', 't.contact_id')
            ->select('t.*', 'c.name as contact_name')->orderBy('t.completed')->orderBy('t.due_at')->limit(500)->get();
    }

    public function projects()
    {
        return DB::table('crm_projects as p')->join('crm_contacts as c', 'c.id', '=', 'p.contact_id')
            ->select('p.*', 'c.name as contact_name')->orderByDesc('p.id')->get();
    }

    public function companies()
    {
        return DB::table('crm_companies')->orderBy('name')->get();
    }

    public function storeCompany(Request $request) { return $this->saveCompany($request); }
    public function updateCompany(Request $request, int $id) { return $this->saveCompany($request, $id); }
    private function saveCompany(Request $request, ?int $id = null)
    {
        $data = $request->validate(['name' => 'required|string|max:190', 'website' => 'nullable|url|max:255', 'phone' => 'nullable|string|max:60', 'address' => 'nullable|string|max:1000', 'notes' => 'nullable|string|max:10000']);
        if (DB::table('crm_companies')->where('name', $data['name'])->when($id, fn ($q) => $q->where('id', '!=', $id))->exists()) return response()->json(['message' => 'Company already exists.'], 422);
        if ($id) { abort_unless(DB::table('crm_companies')->where('id', $id)->exists(), 404); DB::table('crm_companies')->where('id', $id)->update(array_merge($data, ['updated_at' => now()])); }
        else $id = DB::table('crm_companies')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        return DB::table('crm_companies')->find($id);
    }

    public function storeDeal(Request $request) { return $this->saveDeal($request); }
    public function updateDeal(Request $request, int $id) { return $this->saveDeal($request, $id); }
    private function saveDeal(Request $request, ?int $id = null)
    {
        $data = $request->validate([
            'contact_id' => 'required|exists:crm_contacts,id', 'company_id' => 'nullable|exists:crm_companies,id', 'owner_id' => 'nullable|exists:admins,id',
            'title' => 'required|string|max:190', 'stage' => 'required|in:new,contacted,qualified,proposal,negotiation,won,lost',
            'estimated_value' => 'nullable|numeric|min:0', 'agreed_value' => 'nullable|numeric|min:0', 'expected_close_at' => 'nullable|date',
            'lost_reason' => 'nullable|string|max:2000', 'notes' => 'nullable|string|max:10000',
        ]);
        if ($id) { abort_unless(DB::table('crm_deals')->where('id', $id)->exists(), 404); DB::table('crm_deals')->where('id', $id)->update(array_merge($data, ['updated_at' => now()])); }
        else $id = DB::table('crm_deals')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        if ($data['stage'] === 'won') DB::table('crm_contacts')->where('id', $data['contact_id'])->update(['stage' => 'won', 'updated_at' => now()]);
        return DB::table('crm_deals')->find($id);
    }

    public function storeProject(Request $request) { return $this->saveProject($request); }
    public function updateProject(Request $request, int $id) { return $this->saveProject($request, $id); }
    private function saveProject(Request $request, ?int $id = null)
    {
        $data = $request->validate(['contact_id' => 'required|exists:crm_contacts,id', 'deal_id' => 'nullable|exists:crm_deals,id', 'title' => 'required|string|max:190', 'status' => 'required|in:planned,active,on_hold,completed,cancelled', 'start_at' => 'nullable|date', 'due_at' => 'nullable|date', 'notes' => 'nullable|string|max:10000']);
        if (!empty($data['deal_id']) && !DB::table('crm_deals')->where('id', $data['deal_id'])->where('contact_id', $data['contact_id'])->exists()) return response()->json(['message' => 'Deal does not belong to this contact.'], 422);
        if ($id) { abort_unless(DB::table('crm_projects')->where('id', $id)->exists(), 404); DB::table('crm_projects')->where('id', $id)->update(array_merge($data, ['updated_at' => now()])); }
        else $id = DB::table('crm_projects')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        return DB::table('crm_projects')->find($id);
    }

    public function export()
    {
        $this->syncSources();
        $rows = DB::table('crm_contacts')->orderBy('id')->get();
        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['id', 'name', 'email', 'phone', 'company', 'stage', 'source', 'service_interest', 'notes']);
            foreach ($rows as $row) fputcsv($out, [$row->id, $row->name, $row->email, $row->phone, $row->company, $row->stage, $row->source, $row->service_interest, $row->notes]);
            fclose($out);
        }, 'crm-contacts.csv', ['Content-Type' => 'text/csv']);
    }

    private function syncSources(): void
    {
        $sources = [
            ['contact_messages', 'message', 'subject', 'message', 'email', 'name', 'phone', null],
            ['qb_quotes', 'quote', 'reference', 'description', 'email', 'name', 'phone', 'company'],
            ['bookings', 'booking', 'service', 'message', 'email', 'name', 'phone', null],
            ['invoice_clients', 'client', null, 'address', 'email', 'name', 'phone', 'company_name'],
        ];
        foreach ($sources as [$table, $type, $subject, $body, $emailColumn, $nameColumn, $phoneColumn, $companyColumn]) {
            if (! Schema::hasTable($table)) continue;
            foreach (DB::table($table)->whereNotNull($emailColumn)->orderBy('id')->cursor() as $row) {
                $email = strtolower(trim((string) $row->{$emailColumn}));
                if (! filter_var($email, FILTER_VALIDATE_EMAIL)) continue;
                $contact = DB::table('crm_contacts')->where('email', $email)->first();
                if (! $contact) {
                    $id = DB::table('crm_contacts')->insertGetId([
                        'email' => $email, 'name' => $row->{$nameColumn} ?: $email,
                        'phone' => $row->{$phoneColumn} ?: null, 'company' => $companyColumn ? ($row->{$companyColumn} ?: null) : null,
                        'stage' => 'new', 'source' => $type, 'last_interaction_at' => $row->created_at,
                        'created_at' => now(), 'updated_at' => now(),
                    ]);
                    app(CrmAutomationService::class)->run($id, 'contact_created');
                } else {
                    $id = $contact->id;
                }
                $companyId = null;
                if ($companyColumn && trim((string) $row->{$companyColumn}) !== '') {
                    $companyName = trim((string) $row->{$companyColumn});
                    DB::table('crm_companies')->updateOrInsert(['name' => $companyName], ['updated_at' => now()]);
                    $companyId = DB::table('crm_companies')->where('name', $companyName)->value('id');
                    DB::table('crm_contacts')->where('id', $id)->whereNull('company_id')->update(['company_id' => $companyId]);
                }
                if ($type === 'quote' && !DB::table('crm_deals')->where('source_type', 'quote')->where('source_id', $row->id)->exists()) {
                    DB::table('crm_deals')->insert([
                        'contact_id' => $id, 'company_id' => $companyId,
                        'title' => substr((string) ($row->recommended_type ?: 'Website project'), 0, 190),
                        'stage' => 'new', 'estimated_value' => $row->estimated_min,
                        'source_type' => 'quote', 'source_id' => $row->id,
                        'created_at' => $row->created_at, 'updated_at' => now(),
                    ]);
                }
                if (! DB::table('crm_activities')->where('source_type', $type)->where('source_id', $row->id)->exists()) {
                    DB::table('crm_activities')->insert([
                        'contact_id' => $id, 'type' => $type,
                        'subject' => substr((string) ($subject ? ($row->{$subject} ?: ucfirst($type)) : ucfirst($type)), 0, 190),
                        'body' => $body ? ($row->{$body} ?: null) : null,
                        'source_type' => $type, 'source_id' => $row->id,
                        'created_at' => $row->created_at, 'updated_at' => now(),
                    ]);
                    DB::table('crm_contacts')->where('id', $id)->where(function ($q) use ($row) {
                        $q->whereNull('last_interaction_at')->orWhere('last_interaction_at', '<', $row->created_at);
                    })->update(['last_interaction_at' => $row->created_at]);
                }
            }
        }
    }
}
