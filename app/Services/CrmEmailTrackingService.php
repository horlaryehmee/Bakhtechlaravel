<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CrmEmailTrackingService
{
    public function instrument(int $deliveryId, string $html): string
    {
        $token = Str::random(64);
        DB::table('crm_campaign_deliveries')->where('id', $deliveryId)->update([
            'tracking_token' => $token, 'tracked_at' => now(),
        ]);
        // Use the configured public origin so scheduler and web sends share the same URL.
        $url = rtrim(config('app.url'), '/').'/api/crm/email/open/'.$token;
        $pixel = '<img src="'.e($url).'" width="1" height="1" alt="" style="width:1px;height:1px;border:0" />';
        return preg_match('/<\/body\s*>/i', $html)
            ? preg_replace('/<\/body\s*>/i', $pixel.'</body>', $html, 1)
            : $html.$pixel;
    }

    public function record(string $token): void
    {
        DB::transaction(function () use ($token) {
            $delivery = DB::table('crm_campaign_deliveries')->where('tracking_token', $token)
                ->whereIn('status', ['sent', 'processing'])->lockForUpdate()->first();
            if (!$delivery) return;
            $now = now();
            DB::table('crm_campaign_deliveries')->where('id', $delivery->id)->update([
                'opened_at' => $delivery->opened_at ?? $now,
                'last_opened_at' => $now,
                'open_count' => DB::raw('open_count + 1'),
            ]);
            if (!$delivery->opened_at) {
                $subject = DB::table('crm_campaigns')->where('id', $delivery->campaign_id)->value('subject');
                DB::table('crm_activities')->insert([
                    'contact_id' => $delivery->contact_id, 'type' => 'email',
                    'subject' => 'Email opened: '.$subject,
                    'body' => 'The email tracking image was loaded. This is an open signal, not confirmation that the message was read.',
                    'source_type' => 'email_open', 'source_id' => $delivery->id,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        });
    }
}
