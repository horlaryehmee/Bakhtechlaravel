<?php

namespace App\Console\Commands;

use App\Services\SiteRecoveryService;
use Illuminate\Console\Command;

class SiteRecoveryCommand extends Command
{
    protected $signature = 'site:recovery-work';
    protected $description = 'Run a queued settings backup, update, or restore';

    public function handle(SiteRecoveryService $service): int
    {
        if (config('site_maintenance.enabled')) $service->work();
        return self::SUCCESS;
    }
}
