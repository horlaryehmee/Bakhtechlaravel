<?php
namespace App\Console\Commands;
use App\Services\PaidInvoiceClientService;
use Illuminate\Console\Command;
class SyncPaidPortalClients extends Command
{
    protected $signature = 'portal:sync-paid-clients';
    protected $description = 'Reconcile confirmed invoice payments with CRM and portal client accounts';
    public function handle(PaidInvoiceClientService $service): int
    {
        $this->line(json_encode($service->reconcile()));
        return self::SUCCESS;
    }
}
