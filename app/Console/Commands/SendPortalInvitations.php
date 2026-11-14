<?php
namespace App\Console\Commands;
use App\Services\PortalInvitationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
class SendPortalInvitations extends Command
{
    protected $signature = 'portal:send-invitations';
    protected $description = 'Retry pending portal invitation emails using configured mail delivery';
    public function handle(PortalInvitationService $service): int
    {
        $ids = DB::table('portal_invitation_mail')->whereIn('status', ['pending', 'retry'])->where('next_attempt_at', '<=', now())->orderBy('id')->limit(20)->pluck('id');
        foreach ($ids as $id) $this->line('Invitation #'.$id.': '.$service->deliver($id));
        return self::SUCCESS;
    }
}
