<?php
namespace App\Services;

use App\Models\ClientProject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientPortalAccess
{
    public function projects(Request $request)
    {
        $query = ClientProject::query();
        if ($admin = $request->attributes->get('portal_admin')) {
            if (($admin->role ?? 'admin') !== 'admin') $query->whereIn('id', DB::table('client_project_members')->where('admin_id', $admin->id)->select('project_id'));
        } else $query->where('client_id', $request->attributes->get('portal_client')->id);
        return $query;
    }

    public function project(Request $request, int $id, ?string $permission = null): ClientProject
    {
        $project = $this->projects($request)->findOrFail($id);
        if ($permission) {
            $admin = $request->attributes->get('portal_admin');
            abort_unless($admin, 403);
            if (($admin->role ?? 'admin') !== 'admin') abort_unless(DB::table('client_project_members')->where('project_id', $id)->where('admin_id', $admin->id)->where($permission, true)->exists(), 403);
        }
        return $project;
    }

    public function administrator(Request $request): void
    {
        abort_unless(($request->attributes->get('portal_admin')->role ?? '') === 'admin', 403);
    }

    public function record(Request $request, ClientProject $project, string $event, ?string $details = null, bool $notify = false): void
    {
        DB::table('client_activity')->insert(['project_id' => $project->id, 'actor' => ($request->attributes->get('portal_admin') ?? $request->attributes->get('portal_client'))->name, 'event' => $event, 'details' => $details, 'created_at' => now(), 'updated_at' => now()]);
        if ($notify) DB::table('client_notifications')->insert(['user_id' => $project->client_id, 'project_id' => $project->id, 'message' => mb_substr($event.($details ? ': '.$details : ''), 0, 255), 'created_at' => now(), 'updated_at' => now()]);
    }
}
