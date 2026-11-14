<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;

class SendMaintenanceNotifications extends Command
{
    protected $signature = 'site:maintenance-notifications';
    protected $description = 'Email maintenance subscribers after the site returns online';

    public function handle(): int
    {
        if (app()->isDownForMaintenance()) return self::SUCCESS;
        $directory = config('site_maintenance.notifications', storage_path('app/private/maintenance-notifications'));
        if (! is_dir($directory)) return self::SUCCESS;
        // A log/array mailer does not deliver mail. Preserve requests until SMTP is configured.
        if (in_array(config('mail.default'), ['log', 'array'])) return self::SUCCESS;
        $lock = fopen($directory.'/.lock', 'c+');
        if (! flock($lock, LOCK_EX | LOCK_NB)) { fclose($lock); return self::SUCCESS; }
        try {
            foreach (array_slice(glob($directory.'/*.json'), 0, 50) as $file) {
                if (app()->isDownForMaintenance()) break;
                try {
                    $entry = json_decode(Crypt::decryptString(file_get_contents($file)), true, 512, JSON_THROW_ON_ERROR);
                    if (strtotime($entry['createdAt']) < time() - 30 * 86400) { unlink($file); continue; }
                    Mail::raw("Bakhtech is back online.\n\nOur website maintenance is complete. You can visit us at ".config('app.url')."\n\nYou received this one-time message because you asked for a maintenance update. You have not been subscribed to marketing emails.", function ($message) use ($entry) {
                        $message->to($entry['email'])->subject('Bakhtech is back online');
                    });
                    unlink($file);
                } catch (\Throwable) {
                    $this->warn('A notification could not be delivered; retained for retry.');
                }
            }
        } finally { flock($lock, LOCK_UN); fclose($lock); }
        return self::SUCCESS;
    }
}
