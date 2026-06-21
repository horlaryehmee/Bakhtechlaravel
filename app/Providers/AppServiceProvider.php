<?php

namespace App\Providers;

use App\Services\MailConfigurationService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
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
        RateLimiter::for('invoice-payment', function (Request $request) {
            return Limit::perMinute(20)
                ->by(strtolower((string) $request->route('token')).'|'.$request->ip())
                ->response(fn () => response()->json([
                    'message' => 'Too many payment attempts for this invoice. Please wait a minute and try again.',
                ], 429));
        });

        app(MailConfigurationService::class)->apply();

        Event::listen(MessageSent::class, function (MessageSent $event) {
            if (! Schema::hasTable('email_logs')) {
                return;
            }

            $message = $event->message;
            $subject = $message->getSubject();
            $bodyHtml = $message->getHtmlBody();
            $bodyText = $message->getTextBody();
            $sourceHeader = $message->getHeaders()->get('X-Bakhtech-Source');
            $source = $sourceHeader ? trim($sourceHeader->getBodyAsString()) : 'website';

            foreach ($message->getTo() as $recipient) {
                DB::table('email_logs')->insert([
                    'recipient' => strtolower($recipient->getAddress()),
                    'subject' => $subject,
                    'body_html' => $bodyHtml,
                    'body_text' => $bodyText,
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
