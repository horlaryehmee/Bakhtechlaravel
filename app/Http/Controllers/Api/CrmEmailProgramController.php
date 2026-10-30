<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CrmEmailProgramService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CrmEmailProgramController extends Controller
{
    public function index(Request $request)
    {
        $kind = $request->validate(['kind' => 'required|in:recurring,sequence'])['kind'];
        return DB::table('crm_email_programs as p')->leftJoin('crm_segments as s', 's.id', '=', 'p.segment_id')
            ->where('p.kind', $kind)->select('p.*', 's.name as segment_name')
            ->selectSub(DB::table('crm_email_program_runs as r')->whereColumn('r.program_id', 'p.id')->selectRaw('count(*)'), 'run_count')
            ->selectSub(DB::table('crm_email_program_enrollments as e')->whereColumn('e.program_id', 'p.id')->where('e.status', 'active')->selectRaw('count(*)'), 'active_enrollments')
            ->orderByDesc('p.id')->get()->map(function ($row) {
                $row->steps = json_decode($row->steps ?: '[]', true) ?: [];
                return $row;
            });
    }

    public function show(int $id)
    {
        $program = DB::table('crm_email_programs')->find($id);
        abort_unless($program, 404);
        $program->steps = json_decode($program->steps ?: '[]', true) ?: [];
        return response()->json([
            'program' => $program,
            'runs' => DB::table('crm_email_program_runs as r')->leftJoin('crm_contacts as c', 'c.id', '=', 'r.contact_id')
                ->where('r.program_id', $id)->select('r.*', 'c.name as contact_name')->orderByDesc('r.id')->limit(50)->get(),
            'enrollments' => DB::table('crm_email_program_enrollments')->where('program_id', $id)
                ->select('status')->selectRaw('count(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    public function save(Request $request, ?int $id = null)
    {
        $data = $request->validate([
            'kind' => 'required|in:recurring,sequence', 'name' => 'required|string|max:160',
            'enabled' => 'required|boolean', 'segment_id' => 'nullable|integer|exists:crm_segments,id',
            'frequency' => 'nullable|in:daily,weekly,monthly', 'next_run_at' => 'nullable|date',
            'editor_type' => 'required|in:default,classic,html,visual',
            'subject' => 'nullable|string|max:190', 'body' => 'nullable|string|max:100000',
            'steps' => 'nullable|array|max:20', 'steps.*.subject' => 'required_with:steps|string|max:190',
            'steps.*.body' => 'required_with:steps|string|max:100000', 'steps.*.delay_days' => 'required_with:steps|integer|min:0|max:365',
        ]);
        if ($data['kind'] === 'recurring' && (empty($data['frequency']) || empty($data['next_run_at']) || !trim($data['subject'] ?? '') || !trim($data['body'] ?? ''))) {
            return response()->json(['message' => 'Recurring campaigns need a frequency, next send time, subject, and body.'], 422);
        }
        if ($data['kind'] === 'sequence' && (empty($data['steps']) || collect($data['steps'])->contains(fn ($step) => !trim($step['subject']) || !trim($step['body'])))) {
            return response()->json(['message' => 'Email sequences need at least one complete step.'], 422);
        }
        if ($id) {
            $existing = DB::table('crm_email_programs')->find($id);
            abort_unless($existing, 404);
            if ($existing->kind !== $data['kind']) return response()->json(['message' => 'Program type cannot be changed.'], 422);
            if ($existing->kind === 'sequence' && DB::table('crm_email_program_enrollments')->where('program_id', $id)->where('status', 'active')->exists()
                && json_decode($existing->steps ?: '[]', true) !== ($data['steps'] ?? [])) {
                return response()->json(['message' => 'Pause and finish active enrollments before changing sequence steps.'], 422);
            }
        }
        $data['steps'] = json_encode($data['kind'] === 'sequence' ? ($data['steps'] ?? []) : []);
        $data['segment_id'] = $data['segment_id'] ?? null;
        $data['frequency'] = $data['kind'] === 'recurring' ? $data['frequency'] : null;
        $data['next_run_at'] = $data['kind'] === 'recurring' ? Carbon::parse($data['next_run_at'])->utc()->toDateTimeString() : null;
        $data['subject'] = $data['kind'] === 'recurring' ? $data['subject'] : null;
        $data['body'] = $data['kind'] === 'recurring' ? $data['body'] : null;
        if ($id) DB::table('crm_email_programs')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        else $id = DB::table('crm_email_programs')->insertGetId(array_merge($data, ['created_at' => now(), 'updated_at' => now()]));
        return $this->show($id);
    }

    public function enroll(int $id, CrmEmailProgramService $service)
    {
        $program = DB::table('crm_email_programs')->find($id);
        abort_unless($program && $program->kind === 'sequence', 404);
        if (!$program->enabled) return response()->json(['message' => 'Enable the sequence before enrolling contacts.'], 422);
        return response()->json(['enrolled' => $service->enroll($id)]);
    }

    public function retry(int $id, int $run)
    {
        $found = DB::table('crm_email_program_runs')->where('id', $run)->where('program_id', $id)->where('status', 'failed')->first();
        abort_unless($found, 404);
        if ($found->campaign_id) {
            DB::table('crm_campaign_deliveries')->where('campaign_id', $found->campaign_id)->where('status', 'failed')->update(['status' => 'pending', 'error' => null, 'updated_at' => now()]);
            DB::table('crm_campaigns')->where('id', $found->campaign_id)->update(['status' => 'sending', 'updated_at' => now()]);
        }
        DB::table('crm_email_program_runs')->where('id', $run)->update(['status' => 'pending', 'error' => null, 'updated_at' => now()]);
        return $this->show($id);
    }

    public function destroy(int $id)
    {
        abort_unless(DB::table('crm_email_programs')->where('id', $id)->exists(), 404);
        DB::table('crm_email_programs')->where('id', $id)->delete();
        return response()->noContent();
    }
}
