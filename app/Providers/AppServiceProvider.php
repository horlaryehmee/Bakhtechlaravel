<?php

namespace App\Providers;

use App\Services\MailConfigurationService;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        app(MailConfigurationService::class)->apply();

        Event::listen(MessageSent::class, function (MessageSent $event) {
            if (! Schema::hasTable('email_logs')) {
                return;
            }

            $message = $event->message;
            $subject = $message->getSubject();
            $sourceHeader = $message->getHeaders()->get('X-Bakhtech-Source');
            $source = $sourceHeader ? trim($sourceHeader->getBodyAsString()) : 'website';

            foreach ($message->getTo() as $recipient) {
                DB::table('email_logs')->insert([
                    'recipient' => strtolower($recipient->getAddress()),
                    'subject' => $subject,
                    'source' => $source ?: 'website',
                    'mailer' => config('mail.default'),
                    'status' => 'sent',
                    'sent_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });
    }
}
