<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClientPortalAccess;
use App\Services\PortalInvitationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PortalOnboardingController extends Controller
{
    public function copyLink(Request $r, int $id, ClientPortalAccess $access, PortalInvitationService $service)
    {
        $access->administrator($r);
        return response()->json($service->copyLink($id))->header('Cache-Control', 'private, no-store')->header('Pragma', 'no-cache');
    }

    public function lookup(Request $r, ClientPortalAccess $access)
    {
        $access->administrator($r);
        $email = strtolower($r->validate(['email' => 'required|email|max:190'])['email']);
        $user = DB::table('users')->whereRaw('LOWER(email) = ?', [$email])->select('id', 'name', 'email', 'company', 'portal_active', 'portal_password_set', 'crm_contact_id')->first();
        $crm = DB::table('crm_contacts')->whereRaw('LOWER(email) = ?', [$email])->select('id', 'name', 'email', 'company', 'phone')->first();
        $invoice = DB::table('invoice_clients')->whereRaw('LOWER(email) = ?', [$email])->select('name', 'email', 'company_name as company', 'phone')->first();
        $enquiry = DB::table('contact_messages')->whereRaw('LOWER(email) = ?', [$email])->select('name', 'email')->latest('id')->first();
        $booking = DB::table('bookings')->whereRaw('LOWER(email) = ?', [$email])->select('name', 'email')->latest('id')->first();
        $match = $user ?? $crm ?? $invoice ?? $enquiry ?? $booking;
        return ['user' => $user, 'crm_contact' => $crm, 'suggestion' => $match ? ['name' => $match->name, 'company' => $match->company ?? $crm?->company ?? $invoice?->company ?? '', 'phone' => $crm?->phone ?? $invoice?->phone ?? '', 'source' => $user ? 'Portal account' : ($crm ? 'CRM contact' : ($invoice ? 'Invoice client' : ($enquiry ? 'Contact enquiry' : 'Booking')))] : null];
    }

    public function invite(Request $r, int $id, ClientPortalAccess $access, PortalInvitationService $service)
    {
        $admin = $r->attributes->get('portal_admin');
        if (($admin->role ?? '') !== 'admin') {
            abort_unless($access->projects($r)->where('client_id', $id)->whereIn('id', DB::table('client_project_members')->where('admin_id', $admin->id)->where('can_manage', true)->select('project_id'))->exists(), 403);
        }
        $mailId = $service->queue($id);
        $status = $service->deliver($mailId);
        return ['message' => $status === 'sent' ? 'Invitation accepted by the mail server.' : 'Invitation saved. Delivery is pending; check your connection and mail settings.', 'delivery_status' => $status];
    }

    public function revoke(Request $r, int $id, ClientPortalAccess $access, PortalInvitationService $service)
    {
        $access->administrator($r);
        abort_unless(DB::table('users')->where('id', $id)->exists(), 404);
        DB::transaction(function () use ($id, $service) {
            DB::table('users')->where('id', $id)->lockForUpdate()->first();
            $service->revoke($id);
            DB::table('portal_sessions')->where('user_id', $id)->delete();
        });
        return ['message' => 'Invitation links and existing portal sessions revoked.'];
    }

    public function exchange(Request $r)
    {
        $v = $r->validate(['secret' => 'required|string|size:64|regex:/^[a-f0-9]+$/']);
        return DB::transaction(function () use ($v) {
            $invite = DB::table('portal_invitations')->where('token_hash', hash('sha256', $v['secret']))->first();
            if (!$invite) return response()->json(['login_required' => true, 'message' => 'This link is no longer available. Sign in or ask your project manager for a new invitation.']);
            $user = DB::table('users')->where('id', $invite->user_id)->lockForUpdate()->first();
            // Re-read under the same user lock used by password changes and link rotation.
            $invite = DB::table('portal_invitations')->where('id', $invite->id)->first();
            if (!$user?->portal_active || $user->portal_password_set || $invite->revoked_at || now()->greaterThan($invite->expires_at)) return response()->json(['login_required' => true, 'message' => 'Please sign in with your password or Google. If you use passwordless access, ask your project manager for a new invitation.']);
            $token = Str::random(64);
            DB::table('portal_sessions')->insert(['user_id' => $user->id, 'token_hash' => hash('sha256', $token), 'expires_at' => now()->addHours(12), 'created_at' => now(), 'updated_at' => now()]);
            DB::table('portal_invitations')->where('id', $invite->id)->update(['last_used_at' => now(), 'updated_at' => now()]);
            return response()->json(['token' => $token])->header('Cache-Control', 'private, no-store');
        });
    }
}
