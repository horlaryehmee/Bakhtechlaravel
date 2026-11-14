<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientProject;
use App\Services\ClientPortalAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ClientPortalController extends Controller
{
    public const STATUSES = ['pending', 'awaiting_content', 'content_collection', 'design', 'development', 'review', 'revisions', 'completed', 'on_hold', 'cancelled'];
    public function __construct(private ClientPortalAccess $access) {}

    public function login(Request $r)
    {
        $v = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        $u = DB::table('users')->where('email', $v['email'])->where('portal_active', true)->first();
        abort_unless($u && $u->portal_password_set && Hash::check($v['password'], $u->password), 422, 'The email or password is incorrect.');
        $token = Str::random(64);
        DB::table('portal_sessions')->insert(['user_id' => $u->id, 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addHours(12), 'created_at' => now(), 'updated_at' => now()]);
        return ['token' => $token];
    }

    public function logout(Request $r)
    {
        DB::table('portal_sessions')->where('token_hash', hash('sha256', $r->bearerToken()))->delete();
        return response()->noContent();
    }

    public function index(Request $r)
    {
        $projects = $this->access->projects($r)->with('client:id,name,email,company')->latest()->get();
        $ids = $projects->pluck('id');
        $milestones = DB::table('client_milestones')->whereIn('project_id', $ids)->get()->groupBy('project_id');
        foreach ($projects as $p) {
            $items = $milestones->get($p->id, collect());
            $p->setAttribute('progress', $items->count() ? (int) round($items->where('status', 'completed')->count() / $items->count() * 100) : 0);
        }
        $admin = $r->attributes->get('portal_admin');
        return ['user' => $admin ?? $r->attributes->get('portal_client'), 'is_admin' => (bool) $admin, 'can_create' => ($admin->role ?? '') === 'admin', 'projects' => $projects,
            'stats' => ['active' => $projects->whereNotIn('status', ['completed', 'cancelled'])->count(), 'awaiting' => $projects->whereIn('status', ['awaiting_content', 'content_collection'])->count(), 'products' => DB::table('client_products')->whereIn('project_id', $ids)->count(), 'review' => DB::table('client_products')->whereIn('project_id', $ids)->whereIn('status', ['submitted', 'under_review'])->count()],
            'activity' => DB::table('client_activity')->whereIn('project_id', $ids)->latest('id')->limit(12)->get(),
            'notifications' => $admin ? [] : DB::table('client_notifications')->where('user_id', $r->attributes->get('portal_client')->id)->latest('id')->limit(50)->get(),
        ];
    }

    public function clients(Request $r)
    {
        $this->access->administrator($r);
        return ['clients' => DB::table('users')->select('id', 'name', 'email', 'company', 'portal_active', 'portal_password_set', 'crm_contact_id')->addSelect(['invitation_status' => DB::table('portal_invitation_mail')->select('status')->whereColumn('user_id', 'users.id')->latest('id')->limit(1), 'invitation_error' => DB::table('portal_invitation_mail')->select('error')->whereColumn('user_id', 'users.id')->latest('id')->limit(1)])->orderBy('name')->get(), 'staff' => DB::table('admins')->select('id', 'name', 'email', 'role')->get()];
    }

    public function saveClient(Request $r, ?int $id = null)
    {
        $this->access->administrator($r);
        $r->merge(['email' => strtolower(trim((string) $r->input('email')))]);
        $v = $r->validate(['name' => 'nullable|required_without:company|string|max:190', 'email' => ['required', 'email', 'max:190', Rule::unique('users')->ignore($id)], 'company' => 'nullable|required_without:name|string|max:190', 'phone' => 'nullable|string|max:60', 'password' => 'nullable|string|min:12|max:128', 'portal_active' => 'required|boolean']);
        $v['name'] = $v['name'] ?? $v['company'];
        $isNew = !$id;
        $invitations = app(\App\Services\PortalInvitationService::class);
        $result = DB::transaction(function () use ($id, $v, $isNew, $invitations) {
            $existing = $id ? DB::table('users')->where('id', $id)->lockForUpdate()->first() : null;
            if ($id) abort_unless($existing, 404);
            $crm = DB::table('crm_contacts')->whereRaw('LOWER(email) = ?', [$v['email']])->first();
            if (!$crm) {
                $crmId = DB::table('crm_contacts')->insertGetId(['email' => $v['email'], 'name' => $v['name'], 'company' => $v['company'] ?? null, 'phone' => $v['phone'] ?? null, 'source' => 'portal', 'created_at' => now(), 'updated_at' => now()]);
            } else $crmId = $crm->id;
            $data = $v; unset($data['phone']);
            $data['crm_contact_id'] = $crmId;
            $data['updated_at'] = now();
            $changedPassword = !empty($v['password']);
            if ($changedPassword) { $data['password'] = Hash::make($v['password']); $data['portal_password_set'] = true; }
            elseif ($isNew) { $data['password'] = Hash::make(Str::random(80)); $data['portal_password_set'] = false; }
            else unset($data['password']);
            if ($existing && strtolower($existing->email) !== $v['email']) $data['google_subject'] = null;
            if ($id) {
                DB::table('users')->where('id', $id)->update($data);
                if ($changedPassword || array_key_exists('google_subject', $data) || !$data['portal_active']) {
                    $invitations->revoke($id);
                    DB::table('portal_sessions')->where('user_id', $id)->delete();
                }
            } else $id = DB::table('users')->insertGetId($data + ['created_at' => now()]);
            $mailId = $isNew && $data['portal_active'] ? $invitations->queue($id) : null;
            return ['id' => $id, 'mail_id' => $mailId];
        });
        $status = $result['mail_id'] ? $invitations->deliver($result['mail_id']) : null;
        return ['id' => $result['id'], 'delivery_status' => $status, 'message' => $status === 'sent' ? 'Client saved. Invitation accepted by the mail server.' : ($status ? 'Client saved. Invitation queued for delivery; check your connection and mail settings.' : 'Client details saved.')];
    }

    public function saveProject(Request $r, ?int $id = null)
    {
        $p = $id ? $this->access->project($r, $id, 'can_manage') : null;
        if (!$id) $this->access->administrator($r);
        $v = $r->validate(['title' => 'required|string|max:255', 'client_id' => ['required', Rule::exists('users', 'id')->where('portal_active', true)], 'category' => ['required', Rule::in(['ecommerce', 'corporate', 'landing_page', 'redesign', 'maintenance', 'web_application', 'other'])], 'description' => 'nullable|string|max:20000', 'status' => ['required', Rule::in(self::STATUSES)], 'currency' => 'required|string|size:3|regex:/^[A-Z]{3}$/', 'start_date' => 'nullable|date', 'due_date' => 'nullable|date|after_or_equal:start_date', 'product_limit' => 'required|integer|min:0|max:100000', 'image_limit' => 'required|integer|min:1|max:50', 'upload_limit_mb' => 'required|integer|min:1|max:50']);
        if ($p && ($r->attributes->get('portal_admin')->role ?? '') !== 'admin') abort_unless((int) $v['client_id'] === $p->client_id, 403);
        return DB::transaction(function () use ($r, $v, $p) {
            $old = $p?->status;
            if ($p) $p->update($v); else $p = ClientProject::create($v + ['reference' => 'BK-'.strtoupper(Str::random(8))]);
            $this->access->record($r, $p, $old ? 'Project updated' : 'Project created', $old !== $p->status ? ($old ?? 'new').' → '.$p->status : null, true);
            return ['project' => $p];
        });
    }

    public function show(Request $r, int $project)
    {
        $p = $this->access->project($r, $project);
        $admin = $r->attributes->get('portal_admin');
        $member = $admin ? DB::table('client_project_members')->where('project_id', $project)->where('admin_id', $admin->id)->first() : null;
        return ['project' => $p->load('client:id,name,email,company'), 'can_manage' => $admin && (($admin->role ?? '') === 'admin' || $member?->can_manage), 'can_review' => $admin && (($admin->role ?? '') === 'admin' || $member?->can_review),
            'milestones' => DB::table('client_milestones')->where('project_id', $project)->orderBy('sort_order')->get(),
            'requirements' => DB::table('client_requirements as r')->leftJoin('client_submissions as s', 's.requirement_id', '=', 'r.id')->where('r.project_id', $project)->select('r.*', 's.value', 's.status as submission_status', 's.revision_note')->orderBy('r.sort_order')->get(),
            'product_counts' => DB::table('client_products')->where('project_id', $project)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status'),
            'files' => DB::table('client_files')->where('project_id', $project)->select('id', 'name', 'mime', 'size', 'product_id', 'created_at')->latest('id')->get(),
            'activity' => DB::table('client_activity')->where('project_id', $project)->latest('id')->limit(100)->get(),
            'members' => DB::table('client_project_members as m')->join('admins as a', 'a.id', '=', 'm.admin_id')->where('m.project_id', $project)->select('m.*', 'a.name')->get(),
        ];
    }

    public function member(Request $r, int $project)
    {
        $this->access->administrator($r); $this->access->project($r, $project);
        $v = $r->validate(['admin_id' => 'required|exists:admins,id', 'can_review' => 'required|boolean', 'can_manage' => 'required|boolean']);
        DB::table('client_project_members')->updateOrInsert(['project_id' => $project, 'admin_id' => $v['admin_id']], $v);
        return ['saved' => true];
    }

    public function milestone(Request $r, int $project, ?int $id = null)
    {
        $p = $this->access->project($r, $project, 'can_manage');
        $v = $r->validate(['title' => 'required|string|max:255', 'description' => 'nullable|string|max:5000', 'status' => ['required', Rule::in(['pending', 'in_progress', 'completed'])], 'due_date' => 'nullable|date', 'sort_order' => 'integer|min:0']);
        $v += ['completed_at' => $v['status'] === 'completed' ? now() : null, 'updated_at' => now()];
        return DB::transaction(function () use ($r, $p, $project, $id, $v) {
            if ($id) { $q = DB::table('client_milestones')->where('project_id', $project)->where('id', $id); abort_unless($q->exists(), 404); $q->update($v); }
            else DB::table('client_milestones')->insert($v + ['project_id' => $project, 'created_at' => now()]);
            $this->access->record($r, $p, 'Milestone '.$v['status'], $v['title'], true);
            return ['saved' => true];
        });
    }

    public function requirement(Request $r, int $project)
    {
        $p = $this->access->project($r, $project, 'can_manage');
        $v = $r->validate(['title' => 'required|string|max:255', 'instructions' => 'nullable|string|max:10000', 'field_type' => ['required', Rule::in(['short_text', 'long_text', 'number', 'email', 'url', 'date', 'select', 'multi_select'])], 'required' => 'required|boolean', 'options' => 'nullable|array|max:100', 'options.*' => 'string|max:255', 'due_date' => 'nullable|date']);
        if (in_array($v['field_type'], ['select', 'multi_select'])) abort_unless(count($v['options'] ?? []) > 0, 422, 'Add at least one selection option.');
        $v['options'] = json_encode($v['options'] ?? []);
        DB::table('client_requirements')->insert($v + ['project_id' => $project, 'created_at' => now(), 'updated_at' => now()]);
        $this->access->record($r, $p, 'Content requested', $v['title'], true);
        return ['saved' => true];
    }

    public function submitContent(Request $r, int $project, int $id)
    {
        $p = $this->access->project($r, $project);
        abort_if($r->attributes->get('portal_admin'), 403);
        $req = DB::table('client_requirements')->where('project_id', $project)->where('id', $id)->first(); abort_unless($req, 404);
        $rule = match ($req->field_type) { 'email' => 'email|max:255', 'url' => 'url:http,https|max:2048', 'number' => 'numeric', 'date' => 'date', default => 'string|max:50000' };
        $v = $r->validate(['value' => (($req->required && $r->input('status') === 'submitted') ? 'required|' : 'nullable|').$rule, 'status' => ['required', Rule::in(['draft', 'submitted'])]]);
        if (in_array($req->field_type, ['select', 'multi_select']) && !empty($v['value'])) {
            $values = $req->field_type === 'multi_select' ? preg_split('/\r?\n/', $v['value']) : [$v['value']];
            abort_if(array_diff($values, json_decode($req->options, true) ?? []), 422, 'Choose one of the available options.');
        }
        return DB::transaction(function () use ($r, $p, $id, $v, $req) {
            ClientProject::whereKey($p->id)->lockForUpdate()->first();
            $old = DB::table('client_submissions')->where('requirement_id', $id)->first();
            abort_if($old && !in_array($old->status, ['draft', 'needs_revision']), 422, 'This submission is locked during review.');
            DB::table('client_submissions')->updateOrInsert(['requirement_id' => $id], $v + ['revision_note' => null, 'updated_at' => now(), 'created_at' => $old?->created_at ?? now()]);
            $this->access->record($r, $p, 'Content '.$v['status'], $req->title);
            return ['saved' => true];
        });
    }

    public function products(Request $r, int $project)
    {
        $this->access->project($r, $project);
        $v = $r->validate(['search' => 'nullable|string|max:255', 'status' => 'nullable|string|max:30', 'page' => 'nullable|integer|min:1']);
        return DB::table('client_products')->where('project_id', $project)->when($v['search'] ?? null, fn ($q, $s) => $q->where('name', 'like', '%'.$s.'%'))->when($v['status'] ?? null, fn ($q, $s) => $q->where('status', $s))->latest('id')->paginate(20);
    }

    public function product(Request $r, int $project, ?int $id = null)
    {
        $p = $this->access->project($r, $project);
        abort_if($r->attributes->get('portal_admin'), 403, 'Products are submitted by the client.');
        abort_unless($p->category === 'ecommerce', 422, 'Products are available for ecommerce projects.');
        $v = $r->validate(['name' => 'required|string|max:255', 'sku' => ['nullable', 'string', 'max:100', Rule::unique('client_products')->where('project_id', $project)->ignore($id)], 'description' => 'nullable|string|max:50000', 'short_description' => 'nullable|string|max:5000', 'category' => 'nullable|string|max:255', 'price' => ($r->input('status') === 'submitted' ? 'required' : 'nullable').'|numeric|min:0|max:999999999999.99', 'sale_price' => 'nullable|numeric|min:0|lte:price', 'stock' => 'required|integer|min:0', 'status' => ['required', Rule::in(['draft', 'submitted'])]]);
        return DB::transaction(function () use ($r, $project, $p, $id, $v) {
            ClientProject::whereKey($project)->lockForUpdate()->first();
            if ($id) {
                $q = DB::table('client_products')->where('project_id', $project)->where('id', $id); $old = $q->first(); abort_unless($old, 404);
                abort_unless(in_array($old->status, ['draft', 'needs_revision']), 422, 'Only drafts and products requiring revision can be edited.');
                $q->update($v + ['revision_note' => null, 'updated_at' => now()]);
            } else {
                abort_if(DB::table('client_products')->where('project_id', $project)->count() >= $p->product_limit, 422, 'Your project product allowance has been reached.');
                $id = DB::table('client_products')->insertGetId($v + ['project_id' => $project, 'created_at' => now(), 'updated_at' => now()]);
            }
            $this->access->record($r, $p, 'Product '.$v['status'], $v['name']);
            return ['id' => $id];
        });
    }

    public function review(Request $r, int $project, string $kind, int $id)
    {
        $p = $this->access->project($r, $project, 'can_review');
        abort_unless(in_array($kind, ['products', 'content']), 404);
        $v = $r->validate(['status' => ['required', Rule::in($kind === 'products' ? ['under_review', 'needs_revision', 'approved', 'published', 'archived'] : ['under_review', 'needs_revision', 'approved'])], 'revision_note' => 'required_if:status,needs_revision|nullable|string|max:10000', 'published_url' => 'required_if:status,published|nullable|url:http,https|max:2048']);
        return DB::transaction(function () use ($r, $p, $project, $kind, $id, $v) {
            $q = $kind === 'products' ? DB::table('client_products')->where('project_id', $project)->where('id', $id) : DB::table('client_submissions')->where('requirement_id', $id)->whereIn('requirement_id', DB::table('client_requirements')->where('project_id', $project)->select('id'));
            $old = $q->lockForUpdate()->first(); abort_unless($old, 404);
            $transitions = ['submitted' => ['under_review', 'approved', 'needs_revision'], 'under_review' => ['approved', 'needs_revision'], 'approved' => ['published', 'archived'], 'published' => ['archived']];
            abort_unless(in_array($v['status'], $transitions[$old->status] ?? []), 422, 'This review transition is not allowed.');
            if ($kind === 'content') unset($v['published_url']);
            $q->update($v + ['updated_at' => now()]);
            $this->access->record($r, $p, ucfirst($kind).' '.$v['status'], '#'.$id.' '.($v['revision_note'] ?? $v['published_url'] ?? ''), true);
            return ['saved' => true];
        });
    }

    public function upload(Request $r, int $project)
    {
        $p = $this->access->project($r, $project);
        if ($r->attributes->get('portal_admin')) $this->access->project($r, $project, 'can_manage');
        $r->validate(['file' => 'required|file|mimes:jpg,jpeg,png,webp,pdf,doc,docx,txt,csv,xlsx|max:'.($p->upload_limit_mb * 1024), 'product_id' => 'nullable|integer']);
        $file = $r->file('file');
        abort_unless(in_array(strtolower($file->getClientOriginalExtension()), ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx']), 422, 'Unsupported file extension.');
        return DB::transaction(function () use ($r, $p, $project, $file) {
            ClientProject::whereKey($project)->lockForUpdate()->first();
            if ($r->input('product_id')) {
                $product = DB::table('client_products')->where('project_id', $project)->where('id', $r->input('product_id'))->first(); abort_unless($product, 404);
                abort_unless(in_array($product->status, ['draft', 'needs_revision']), 422, 'Product images are locked during review.');
                abort_unless(in_array($file->getMimeType(), ['image/jpeg', 'image/png', 'image/webp']), 422, 'Product attachments must be images.');
                abort_if(DB::table('client_files')->where('product_id', $product->id)->count() >= $p->image_limit, 422, 'The image allowance has been reached.');
            }
            $path = $file->store('client-projects/'.$project, 'local'); abort_unless($path, 500, 'The file could not be stored.');
            try {
                $id = DB::table('client_files')->insertGetId(['project_id' => $project, 'product_id' => $r->input('product_id'), 'user_id' => $r->attributes->get('portal_client')?->id, 'name' => mb_substr(basename($file->getClientOriginalName()), 0, 255), 'path' => $path, 'mime' => $file->getMimeType(), 'size' => $file->getSize(), 'created_at' => now(), 'updated_at' => now()]);
                $this->access->record($r, $p, 'File uploaded', basename($file->getClientOriginalName()));
            } catch (\Throwable $e) { Storage::disk('local')->delete($path); throw $e; }
            return ['id' => $id];
        });
    }

    public function download(Request $r, int $project, int $id)
    {
        $this->access->project($r, $project);
        $file = DB::table('client_files')->where('project_id', $project)->where('id', $id)->first(); abort_unless($file, 404);
        return Storage::disk('local')->download($file->path, $file->name, ['Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function notification(Request $r, int $id)
    {
        $q = DB::table('client_notifications')->where('user_id', $r->attributes->get('portal_client')->id)->where('id', $id); abort_unless($q->exists(), 404); $q->update(['read_at' => now()]); return ['saved' => true];
    }

    public function account(Request $r)
    {
        $u = $r->attributes->get('portal_client');
        $v = $r->validate(['name' => 'nullable|required_without:company|string|max:190', 'company' => 'nullable|required_without:name|string|max:190', 'current_password' => 'nullable|string', 'password' => 'nullable|string|min:12|max:128|confirmed']);
        $v['name'] = $v['name'] ?? $v['company'];
        return DB::transaction(function () use ($r, $u, $v) {
            $user = DB::table('users')->where('id', $u->id)->lockForUpdate()->first();
            if (!empty($v['password'])) {
                if ($user->portal_password_set) abort_unless(Hash::check($v['current_password'] ?? '', $user->password), 422, 'Current password is incorrect.');
                $v['password'] = Hash::make($v['password']);
                $v['portal_password_set'] = true;
                app(\App\Services\PortalInvitationService::class)->revoke($u->id);
                DB::table('portal_sessions')->where('user_id', $u->id)->where('token_hash', '!=', hash('sha256', $r->bearerToken()))->delete();
            } else unset($v['password']);
            unset($v['current_password']);
            DB::table('users')->where('id', $u->id)->update($v + ['updated_at' => now()]);
            return ['saved' => true, 'message' => isset($v['password']) ? 'Password saved. Passwordless links are now disabled. Use your password or Google next time.' : 'Profile updated.'];
        });
    }
}
