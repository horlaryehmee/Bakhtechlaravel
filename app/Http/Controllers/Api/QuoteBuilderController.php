<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\QuoteBuilder;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class QuoteBuilderController extends Controller
{
    public function catalog(QuoteBuilder $builder)
    {
        return response()->json($builder->catalog())->header('Cache-Control', 'no-store');
    }

    private function configuration(Request $request): array
    {
        return $request->validate(['project_type' => 'required|string|max:100', 'discovery' => 'nullable|string|max:100', 'answers' => 'present|array|max:100', 'answers.*' => 'string|max:255', 'features' => 'present|array|max:100', 'features.*' => 'integer|distinct']);
    }

    public function estimate(Request $request, QuoteBuilder $builder)
    {
        return response()->json($builder->estimate($this->configuration($request)));
    }

    public function store(Request $request, QuoteBuilder $builder)
    {
        $input = $this->configuration($request);
        $lead = $request->validate(['name' => 'required|string|max:150', 'company' => 'required|string|max:150', 'email' => 'required|email|max:254', 'phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9 ()-]{7,30}$/'], 'description' => 'nullable|string|max:5000']);
        $reference = DB::transaction(function () use ($input, $lead, $builder) {
            $estimate = $builder->estimate($input, true);
            $reference = (string) Str::uuid();
            $id = DB::table('qb_quotes')->insertGetId(array_merge($lead, collect($estimate)->only(['project_type_id', 'selected_type', 'recommended_type', 'complexity', 'estimated_min', 'estimated_max'])->all(), ['reference' => $reference, 'calculation' => json_encode($estimate['calculation']), 'created_at' => now(), 'updated_at' => now()]));
            foreach ($estimate['answers'] as $answer) {
                DB::table('qb_quote_answers')->insert(['quote_id' => $id] + $answer);
            }
            foreach ($estimate['features'] as $feature) {
                DB::table('qb_quote_features')->insert(['quote_id' => $id] + $feature);
            }

            return $reference;
        });

        return response()->json(['reference' => $reference], 201);
    }

    public function admin(QuoteBuilder $builder)
    {
        return response()->json($builder->catalog(true));
    }

    public function quotes(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:150',
            'project_type_id' => 'nullable|integer|exists:qb_project_types,id',
            'estimate' => 'nullable|in:range,custom',
            'sort' => 'nullable|in:newest,oldest',
            'from' => 'nullable|date_format:Y-m-d',
            'to' => 'nullable|date_format:Y-m-d|after_or_equal:from',
            'page' => 'nullable|integer|min:1',
        ]);
        $query = DB::table('qb_quotes');
        if ($search = trim($data['search'] ?? '')) {
            $query->where(function ($q) use ($search) {
                foreach (['name', 'company', 'email', 'phone', 'reference'] as $field) {
                    $q->orWhere($field, 'like', '%'.$search.'%');
                }
            });
        }
        if (! empty($data['project_type_id'])) {
            $query->where('project_type_id', $data['project_type_id']);
        }
        if (($data['estimate'] ?? '') === 'custom') {
            $query->whereNull('estimated_min');
        }
        if (($data['estimate'] ?? '') === 'range') {
            $query->whereNotNull('estimated_min');
        }
        if (! empty($data['from'])) {
            $query->where('created_at', '>=', $data['from'].' 00:00:00');
        }
        if (! empty($data['to'])) {
            $query->where('created_at', '<', Carbon::parse($data['to'])->addDay()->startOfDay());
        }
        $quotes = $query->orderBy('id', ($data['sort'] ?? 'newest') === 'oldest' ? 'asc' : 'desc')->paginate(20);
        $quotes->through(function ($q) {
            unset($q->calculation, $q->description);
            $q->created_at = Carbon::parse($q->created_at)->toIso8601String();

            return $q;
        });

        return response()->json($quotes->toArray() + ['summary' => [
            'total' => DB::table('qb_quotes')->count(),
            'custom' => DB::table('qb_quotes')->whereNull('estimated_min')->count(),
            'recent' => DB::table('qb_quotes')->where('created_at', '>=', now()->subDays(7))->count(),
        ]])->header('Cache-Control', 'no-store');
    }

    public function showQuote(int $id)
    {
        $quote = DB::table('qb_quotes')->where('id', $id)->first();
        abort_unless($quote, 404);
        $quote->calculation = json_decode($quote->calculation);
        $quote->answers = DB::table('qb_quote_answers')->where('quote_id', $id)->orderBy('id')->get();
        $quote->features = DB::table('qb_quote_features')->where('quote_id', $id)->orderBy('id')->get();
        $quote->created_at = Carbon::parse($quote->created_at)->toIso8601String();

        return response()->json($quote)->header('Cache-Control', 'no-store');
    }

    public function reorder(Request $request, string $entity)
    {
        abort_unless(in_array($entity, ['project_types', 'questions', 'features'], true), 404);
        $data = $request->validate([
            'ids' => 'required|array|min:1|max:1000',
            'ids.*' => 'required|integer|distinct',
            'project_type_id' => $entity === 'project_types' ? 'prohibited' : 'required|integer|exists:qb_project_types,id',
        ]);
        DB::transaction(function () use ($data, $entity) {
            $query = DB::table('qb_'.$entity)->when($entity !== 'project_types', fn ($q) => $q->where('project_type_id', $data['project_type_id']));
            $existing = $query->lockForUpdate()->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
            $requested = collect($data['ids'])->map(fn ($id) => (int) $id)->sort()->values()->all();
            if ($existing !== $requested) {
                throw ValidationException::withMessages(['ids' => 'The list has changed or contains items from another project. Refresh and try again.']);
            }
            foreach ($data['ids'] as $position => $id) {
                DB::table('qb_'.$entity)->where('id', $id)->update(['sort_order' => $position, 'updated_at' => now()]);
            }
        });

        return response()->json(['message' => 'Frontend order saved.']);
    }

    public function save(Request $request, string $entity, ?int $id = null)
    {
        $money = 'required|integer|min:0|max:10000000';
        $rules = match ($entity) {
            'project_types' => ['slug' => ['required', 'regex:/^[a-z][a-z0-9-]*$/', 'max:100', Rule::notIn(['unsure']), Rule::unique('qb_project_types', 'slug')->ignore($id)], 'name' => 'required|string|max:150', 'description' => 'required|string|max:1000', 'base_min' => 'required|integer|min:5000|max:100000000', 'base_max' => 'required|integer|gte:base_min|max:200000000', 'enabled' => 'required|boolean', 'discovery_key' => ['nullable', 'required_with:discovery_label', 'regex:/^[a-z][a-z0-9-]*$/', 'max:100', Rule::unique('qb_project_types', 'discovery_key')->ignore($id)], 'discovery_label' => 'nullable|required_with:discovery_key|string|max:255'],
            'features' => ['project_type_id' => 'required|exists:qb_project_types,id', 'name' => 'required|string|max:150', 'description' => 'required|string|max:1000', 'price' => $money, 'complexity' => 'required|integer|min:0|max:20', 'optional' => 'required|boolean', 'custom_quote' => 'required|boolean', 'enabled' => 'required|boolean'],
            'questions' => ['project_type_id' => 'required|exists:qb_project_types,id', 'label' => 'required|string|max:255', 'options' => 'required|array|min:2|max:20', 'options.*.label' => 'required|string|max:255|distinct', 'options.*.price' => $money, 'options.*.complexity' => 'required|integer|min:0|max:20'],
            'rules' => ['level' => ['required', Rule::in(['Basic', 'Standard', 'Advanced', 'Discovery']), Rule::unique('qb_rules', 'level')->ignore($id)], 'minimum_score' => ['required', 'integer', 'min:0', 'max:100', Rule::unique('qb_rules', 'minimum_score')->ignore($id)], 'uplift_percent' => 'required|integer|min:0|max:100', 'range_percent' => 'required|integer|min:0|max:100', 'custom_quote' => 'required|boolean'],
            default => abort(404),
        };
        $data = $request->validate($rules);
        if ($entity === 'rules' && ! $data['custom_quote']) {
            $request->validate(['range_percent' => 'integer|min:5']);
        }
        if ($entity === 'rules' && $id && (int) DB::table('qb_rules')->where('id', $id)->value('minimum_score') === 0) {
            $request->validate(['minimum_score' => 'in:0']);
        }
        if (isset($data['options'])) {
            $data['options'] = json_encode($data['options']);
        }
        $data['updated_at'] = now();
        if ($id) {
            abort_unless(DB::table('qb_'.$entity)->where('id', $id)->exists(), 404);
            DB::table('qb_'.$entity)->where('id', $id)->update($data);
        } else {
            if (in_array($entity, ['project_types', 'questions', 'features'], true)) {
                $data['sort_order'] = (int) DB::table('qb_'.$entity)->max('sort_order') + 1;
            }
            $id = DB::table('qb_'.$entity)->insertGetId($data + ['created_at' => now()]);
        }

        return response()->json(['id' => $id]);
    }
}
