<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

class BookingNotificationService
{
    public function bookingCreated(int $bookingId): void
    {
        $booking = $this->booking($bookingId);
        if (! $booking) {
            return;
        }

        $settings = $this->calendarEmailSettings($booking);
        $variables = $this->variables($booking);
        $attendeeMessage = $this->render(
            (string) ($settings['confirmationTemplate'] ?? $this->defaultConfirmationTemplate()),
            $variables
        );
        $adminMessage = $this->render(
            (string) ($settings['adminTemplate'] ?? $this->defaultAdminTemplate()),
            $variables
        );
        $attendeeContent = $this->emailContent($booking, 'confirmation', $attendeeMessage);
        $adminContent = $this->emailContent($booking, 'admin', $adminMessage);

        $this->send(
            (string) $booking->email,
            (string) DB::table('booking_settings')->where('key', 'confirmation_email_subject')->value('value') ?: 'Your booking is confirmed',
            $attendeeContent,
            'booking-confirmation'
        );

        $adminEmail = $this->adminEmail($booking);
        if ($adminEmail !== '') {
            $this->send(
                $adminEmail,
                'New appointment request: '.($booking->event_type_name ?: $booking->service),
                $adminContent,
                'booking-admin-notification'
            );
        }

        $this->scheduleReminders($booking, $settings, $adminEmail);
    }

    public function sendDueReminders(int $limit = 100): array
    {
        $expired = $this->expirePastBookingReminders();

        $due = DB::table('booking_reminders')
            ->join('bookings', 'bookings.id', '=', 'booking_reminders.booking_id')
            ->leftJoin('booking_event_types', 'booking_event_types.id', '=', 'bookings.booking_event_type_id')
            ->leftJoin('booking_calendars', 'booking_calendars.id', '=', 'bookings.booking_calendar_id')
            ->select(
                'booking_reminders.*',
                'bookings.name',
                'bookings.email',
                'bookings.phone',
                'bookings.message',
                'bookings.service',
                'bookings.starts_at',
                'bookings.ends_at',
                'bookings.duration_minutes',
                'bookings.timezone',
                'bookings.attendee_timezone',
                'bookings.location_type',
                'bookings.location_value',
                'bookings.status as booking_status',
                'booking_event_types.name as event_type_name',
                'booking_calendars.name as calendar_name',
                'booking_calendars.settings_json'
            )
            ->where('booking_reminders.status', 'pending')
            ->where('booking_reminders.scheduled_for', '<=', now())
            ->orderBy('booking_reminders.scheduled_for')
            ->limit($limit)
            ->get();

        $sent = 0;
        $failed = 0;

        foreach ($due as $reminder) {
            if ($this->reminderShouldExpire($reminder)) {
                $this->expireReminder((int) $reminder->id, 'Booking time has passed or booking is no longer active.');
                $expired++;

                continue;
            }

            $settings = $this->decodedEmailSettings($reminder->settings_json ?? null);
            $customMessage = $this->render(
                (string) ($settings['reminderTemplate'] ?? $this->defaultReminderTemplate()),
                $this->variables($reminder)
            );
            $content = $this->emailContent(
                $reminder,
                'reminder',
                $customMessage,
                (int) $reminder->minutes_before,
                (string) $reminder->recipient_type
            );
            $subject = (string) DB::table('booking_settings')
                ->where('key', 'reminder_email_subject')
                ->value('value') ?: 'Reminder: your booking is coming up';

            try {
                $this->deliver((string) $reminder->recipient_email, $subject, $content, 'booking-reminder');

                DB::table('booking_reminders')->where('id', $reminder->id)->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                    'error_message' => null,
                    'updated_at' => now(),
                ]);
                $sent++;
            } catch (\Throwable $exception) {
                DB::table('booking_reminders')->where('id', $reminder->id)->update([
                    'status' => 'failed',
                    'error_message' => $exception->getMessage(),
                    'updated_at' => now(),
                ]);
                $this->logFailure(
                    (string) $reminder->recipient_email,
                    $subject,
                    $content,
                    'booking-reminder',
                    $exception
                );
                $failed++;
            }
        }

        return ['processed' => $due->count(), 'sent' => $sent, 'failed' => $failed, 'expired' => $expired];
    }

    private function expirePastBookingReminders(): int
    {
        if (! Schema::hasTable('booking_reminders')) {
            return 0;
        }

        $ids = DB::table('booking_reminders')
            ->join('bookings', 'bookings.id', '=', 'booking_reminders.booking_id')
            ->where('booking_reminders.status', 'pending')
            ->where(function ($query) {
                $query
                    ->where('bookings.starts_at', '<=', now())
                    ->orWhereIn('bookings.status', ['cancelled', 'closed', 'completed']);
            })
            ->limit(1000)
            ->pluck('booking_reminders.id');

        if ($ids->isEmpty()) {
            return 0;
        }

        return DB::table('booking_reminders')
            ->whereIn('id', $ids)
            ->update([
                'status' => 'expired',
                'error_message' => 'Booking time has passed or booking is no longer active.',
                'updated_at' => now(),
            ]);
    }

    private function reminderShouldExpire(object $reminder): bool
    {
        if (in_array((string) $reminder->booking_status, ['cancelled', 'closed', 'completed'], true)) {
            return true;
        }

        try {
            $timezone = (string) ($reminder->timezone ?: config('app.timezone', 'UTC'));

            return Carbon::parse($reminder->starts_at, $timezone)->lte(now($timezone));
        } catch (\Throwable) {
            return true;
        }
    }

    private function expireReminder(int $id, string $message): void
    {
        DB::table('booking_reminders')->where('id', $id)->update([
            'status' => 'expired',
            'error_message' => $message,
            'updated_at' => now(),
        ]);
    }

    private function scheduleReminders(object $booking, array $settings, string $adminEmail): void
    {
        if (! Schema::hasTable('booking_reminders')) {
            return;
        }

        $offsets = $this->reminderOffsets($settings, (int) ($booking->reminder_minutes_before ?? 60));
        $recipients = [
            'attendee' => strtolower(trim((string) $booking->email)),
            'admin' => strtolower(trim($adminEmail)),
        ];

        foreach ($offsets as $minutes) {
            $scheduledFor = Carbon::parse($booking->starts_at, $booking->timezone ?: 'UTC')->subMinutes($minutes);
            if ($scheduledFor->isPast()) {
                continue;
            }

            foreach ($recipients as $type => $email) {
                if ($email === '') {
                    continue;
                }

                DB::table('booking_reminders')->updateOrInsert(
                    ['booking_id' => $booking->id, 'recipient_type' => $type, 'minutes_before' => $minutes],
                    [
                        'recipient_email' => $email,
                        'scheduled_for' => $scheduledFor->toDateTimeString(),
                        'status' => 'pending',
                        'sent_at' => null,
                        'error_message' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }

    private function booking(int $bookingId): ?object
    {
        return DB::table('bookings')
            ->leftJoin('booking_event_types', 'booking_event_types.id', '=', 'bookings.booking_event_type_id')
            ->leftJoin('booking_calendars', 'booking_calendars.id', '=', 'bookings.booking_calendar_id')
            ->select(
                'bookings.*',
                'booking_event_types.name as event_type_name',
                'booking_event_types.reminder_minutes_before',
                'booking_calendars.name as calendar_name',
                'booking_calendars.settings_json'
            )
            ->where('bookings.id', $bookingId)
            ->first();
    }

    private function calendarEmailSettings(object $booking): array
    {
        return $this->decodedEmailSettings($booking->settings_json ?? null);
    }

    private function decodedEmailSettings(?string $settingsJson): array
    {
        $settings = json_decode($settingsJson ?: '{}', true);

        return is_array($settings['email'] ?? null) ? $settings['email'] : [];
    }

    private function reminderOffsets(array $settings, int $fallback): array
    {
        $configured = $settings['reminderMinutesBefore'] ?? [$fallback];
        $values = is_array($configured) ? $configured : [$configured];

        return collect($values)
            ->map(fn ($value) => (int) $value)
            ->filter(fn ($value) => $value > 0 && $value <= 43200)
            ->unique()
            ->sortDesc()
            ->values()
            ->all();
    }

    private function adminEmail(object $booking): string
    {
        $resourceEmail = ! empty($booking->booking_resource_id)
            ? DB::table('booking_resources')->where('id', $booking->booking_resource_id)->value('email')
            : null;

        return strtolower(trim((string) (
            $resourceEmail
            ?: DB::table('booking_settings')->where('key', 'admin_alert_email')->value('value')
            ?: DB::table('settings')->where('key', 'contactEmail')->value('value')
        )));
    }

    private function send(string $email, string $subject, array $content, string $source): void
    {
        if ($email === '') {
            return;
        }

        try {
            $this->deliver($email, $subject, $content, $source);
        } catch (\Throwable $exception) {
            $this->logFailure($email, $subject, $content, $source, $exception);
        }
    }

    private function deliver(string $email, string $subject, array $content, string $source): void
    {
        Mail::html($content['html'], function ($message) use ($email, $subject, $source, $content) {
            $message->to($email)
                ->subject($subject)
                ->getHeaders()
                ->addTextHeader('X-Bakhtech-Source', $source);
            $message->getSymfonyMessage()->text($content['text']);
        });
    }

    private function logFailure(
        string $email,
        string $subject,
        array $content,
        string $source,
        \Throwable $exception
    ): void {
        if (! Schema::hasTable('email_logs')) {
            return;
        }

        DB::table('email_logs')->insert([
            'recipient' => strtolower($email),
            'subject' => $subject,
            'body_html' => $content['html'],
            'body_text' => $content['text'],
            'source' => $source,
            'mailer' => config('mail.default'),
            'status' => 'failed',
            'error_message' => $exception->getMessage(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function emailContent(
        object $booking,
        string $kind,
        string $customMessage,
        ?int $minutesBefore = null,
        string $recipientType = 'attendee'
    ): array {
        $brand = $this->branding();
        $timezone = (string) ($booking->attendee_timezone ?: $booking->timezone ?: 'UTC');
        $sourceTimezone = (string) ($booking->timezone ?: 'UTC');
        $start = Carbon::parse($booking->starts_at, $sourceTimezone)->setTimezone($timezone);
        $end = ! empty($booking->ends_at)
            ? Carbon::parse($booking->ends_at, $sourceTimezone)->setTimezone($timezone)
            : $start->copy()->addMinutes((int) ($booking->duration_minutes ?? 30));
        $service = (string) ($booking->event_type_name ?: $booking->service ?: $booking->calendar_name ?: 'Booking');
        $reference = '#'.(string) ($booking->booking_id ?? $booking->id ?? '');
        $location = $this->locationDetails(
            (string) ($booking->location_type ?? ''),
            (string) ($booking->location_value ?? '')
        );
        $isAdmin = $kind === 'admin' || $recipientType === 'admin';
        $heading = match ($kind) {
            'admin' => 'New appointment request',
            'reminder' => $isAdmin ? 'Upcoming booking reminder' : 'Your meeting is coming up',
            default => 'Your booking is confirmed',
        };
        $eyebrow = $kind === 'reminder' && $minutesBefore
            ? 'STARTS IN '.$this->humanizeMinutes($minutesBefore)
            : ($kind === 'admin' ? 'NEW APPOINTMENT' : 'BOOKING CONFIRMED');
        $preheader = $heading.' - '.$service.' on '.$start->format('F j, Y');
        $status = ucfirst((string) ($booking->booking_status ?? $booking->status ?? 'confirmed'));

        $details = [
            ['Appointment type', $service],
            ['Date', $start->format('l, F j, Y')],
            ['Time', $start->format('g:i A').' - '.$end->format('g:i A')],
            ['Timezone', $timezone],
            ['Duration', $this->humanizeMinutes((int) ($booking->duration_minutes ?? $start->diffInMinutes($end)))],
            ['Location', $location['label']],
            ['Status', $status],
            ['Reference', $reference],
        ];
        $attendeeDetails = [
            ['Name', (string) ($booking->name ?? '')],
            ['Email', (string) ($booking->email ?? '')],
            ['Phone', (string) ($booking->phone ?? '')],
        ];

        $detailsRows = $this->detailRows($details);
        $attendeeRows = $this->detailRows($attendeeDetails);
        $messageHtml = nl2br($this->escape(trim($customMessage)));
        $notes = trim((string) ($booking->message ?? ''));
        $notesHtml = $notes !== '' ? '
            <tr>
                <td style="padding:0 32px 24px;">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;">
                        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Booking notes</div>
                        <div style="font-size:15px;line-height:1.7;color:#334155;">'.nl2br($this->escape($notes)).'</div>
                    </div>
                </td>
            </tr>' : '';
        $locationCard = $this->locationCard($location);
        $logo = $brand['logo'] !== ''
            ? '<img src="'.$this->escape($brand['logo']).'" alt="'.$this->escape($brand['name']).'" style="display:block;max-height:46px;max-width:190px;width:auto;height:auto;">'
            : '<div style="font-size:22px;font-weight:800;color:#0f172a;">'.$this->escape($brand['name']).'</div>';
        $websiteLink = $brand['website'] !== ''
            ? '<a href="'.$this->escape($brand['website']).'" style="color:#94a3b8;text-decoration:none;">'.$this->escape($brand['websiteLabel']).'</a>'
            : '';

        $html = '<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>'.$this->escape($heading).'</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">'.$this->escape($preheader).'</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef2f7;">
        <tr>
            <td align="center" style="padding:28px 12px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 35px rgba(15,23,42,.10);">
                    <tr>
                        <td style="padding:24px 32px;background:#ffffff;border-bottom:1px solid #e2e8f0;">'.$logo.'</td>
                    </tr>
                    <tr>
                        <td style="padding:34px 32px 26px;background:#f8fafc;color:#0f172a;border-bottom:1px solid #e2e8f0;">
                            <div style="font-size:12px;font-weight:800;letter-spacing:.14em;color:#ef4444;margin-bottom:12px;">'.$this->escape($eyebrow).'</div>
                            <h1 style="margin:0 0 10px;font-size:30px;line-height:1.2;color:#0f172a;">'.$this->escape($heading).'</h1>
                            <p style="margin:0;font-size:17px;line-height:1.55;color:#475569;">'.$this->escape($service).'</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 32px 22px;">
                            <div style="font-size:15px;line-height:1.75;color:#334155;">'.$messageHtml.'</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
                                <tr>
                                    <td colspan="2" style="padding:17px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:800;letter-spacing:.08em;color:#475569;text-transform:uppercase;">Appointment details</td>
                                </tr>
                                '.$detailsRows.'
                            </table>
                        </td>
                    </tr>
                    '.$locationCard.'
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
                                <tr>
                                    <td colspan="2" style="padding:17px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:800;letter-spacing:.08em;color:#475569;text-transform:uppercase;">Attendee details</td>
                                </tr>
                                '.$attendeeRows.'
                            </table>
                        </td>
                    </tr>
                    '.$notesHtml.'
                    <tr>
                        <td style="padding:24px 32px;background:#0f172a;text-align:center;">
                            <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:7px;">'.$this->escape($brand['name']).'</div>
                            <div style="font-size:12px;line-height:1.7;color:#94a3b8;">'.$this->escape($brand['contact']).($brand['contact'] !== '' && $websiteLink !== '' ? ' &nbsp;|&nbsp; ' : '').$websiteLink.'</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>';

        $textLines = [
            $heading,
            '',
            trim($customMessage),
            '',
            'APPOINTMENT DETAILS',
            ...array_map(fn ($detail) => $detail[0].': '.$detail[1], $details),
            '',
            strtoupper($location['label']),
            $location['value'],
            $location['actionUrl'] !== '' ? $location['actionUrl'] : '',
            '',
            'ATTENDEE DETAILS',
            ...array_map(fn ($detail) => $detail[0].': '.$detail[1], $attendeeDetails),
            $notes !== '' ? "\nBOOKING NOTES\n".$notes : '',
            '',
            $brand['name'],
            $brand['contact'],
            $brand['website'],
        ];

        return [
            'html' => $html,
            'text' => trim(implode("\n", array_filter($textLines, fn ($line) => $line !== null))),
        ];
    }

    private function detailRows(array $details): string
    {
        $rows = '';

        foreach ($details as [$label, $value]) {
            if (trim((string) $value) === '') {
                continue;
            }

            $rows .= '<tr>
                <td style="width:35%;padding:12px 20px;border-bottom:1px solid #eef2f7;font-size:13px;font-weight:700;color:#64748b;vertical-align:top;">'.$this->escape($label).'</td>
                <td style="padding:12px 20px;border-bottom:1px solid #eef2f7;font-size:14px;font-weight:600;color:#0f172a;vertical-align:top;">'.$this->escape((string) $value).'</td>
            </tr>';
        }

        return $rows;
    }

    private function locationDetails(string $type, string $value): array
    {
        $normalizedType = strtolower(str_replace(['-', ' '], '_', trim($type)));
        $trimmedValue = trim($value);
        $isWebUrl = $this->isWebUrl($trimmedValue);
        $isGoogleMeet = $normalizedType === 'google_meet' || str_starts_with(strtolower($trimmedValue), 'https://meet.google.com/');

        return match (true) {
            $isGoogleMeet => [
                'label' => 'Google Meet',
                'value' => $trimmedValue,
                'actionUrl' => $isWebUrl ? $trimmedValue : '',
                'actionLabel' => 'Join Google Meet',
            ],
            $normalizedType === 'zoom' => [
                'label' => 'Zoom meeting',
                'value' => $trimmedValue,
                'actionUrl' => $isWebUrl ? $trimmedValue : '',
                'actionLabel' => 'Join Zoom Meeting',
            ],
            $normalizedType === 'whatsapp' => [
                'label' => 'WhatsApp call',
                'value' => $trimmedValue,
                'actionUrl' => $this->whatsAppUrl($trimmedValue),
                'actionLabel' => 'Open WhatsApp',
            ],
            in_array($normalizedType, ['phone', 'call'], true) => [
                'label' => 'Phone call',
                'value' => $trimmedValue,
                'actionUrl' => $trimmedValue !== '' ? 'tel:'.preg_replace('/[^0-9+]/', '', $trimmedValue) : '',
                'actionLabel' => 'Call '.$trimmedValue,
            ],
            in_array($normalizedType, ['in_person', 'physical'], true) => [
                'label' => 'In-person meeting',
                'value' => $trimmedValue,
                'actionUrl' => $trimmedValue !== '' ? 'https://www.google.com/maps/search/?api=1&query='.rawurlencode($trimmedValue) : '',
                'actionLabel' => 'View on Map',
            ],
            default => [
                'label' => $normalizedType !== '' ? ucwords(str_replace('_', ' ', $normalizedType)) : 'Meeting location',
                'value' => $trimmedValue,
                'actionUrl' => $isWebUrl ? $trimmedValue : '',
                'actionLabel' => 'Open Meeting Link',
            ],
        };
    }

    private function locationCard(array $location): string
    {
        $value = $location['value'] !== ''
            ? '<div style="margin-top:10px;font-size:13px;line-height:1.6;color:#475569;word-break:break-word;">'.$this->escape($location['value']).'</div>'
            : '<div style="margin-top:10px;font-size:13px;color:#64748b;">Connection details will be shared separately.</div>';
        $button = $location['actionUrl'] !== ''
            ? '<div style="margin-top:18px;"><a href="'.$this->escape($location['actionUrl']).'" style="display:inline-block;padding:13px 22px;background:#1261ff;border-radius:10px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;">'.$this->escape($location['actionLabel']).'</a></div>'
            : '';

        return '<tr>
            <td style="padding:0 32px 24px;">
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:20px;">
                    <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1d4ed8;text-transform:uppercase;">How to join</div>
                    <div style="margin-top:7px;font-size:19px;font-weight:800;color:#0f172a;">'.$this->escape($location['label']).'</div>
                    '.$value.$button.'
                </div>
            </td>
        </tr>';
    }

    private function branding(): array
    {
        $settings = Schema::hasTable('settings')
            ? DB::table('settings')
                ->whereIn('key', [
                    'siteName',
                    'company_name',
                    'company_logo',
                    'company_email',
                    'contactEmail',
                    'company_phone',
                    'company_website',
                ])
                ->pluck('value', 'key')
            : collect();
        $name = (string) ($settings['company_name'] ?? $settings['siteName'] ?? config('app.name', 'Bakhtech'));
        $email = (string) ($settings['company_email'] ?? $settings['contactEmail'] ?? '');
        $phone = (string) ($settings['company_phone'] ?? '');
        $website = $this->absoluteUrl((string) ($settings['company_website'] ?? config('app.url', '')));

        return [
            'name' => $name,
            'logo' => $this->absoluteUrl((string) ($settings['company_logo'] ?? '')),
            'contact' => implode(' | ', array_filter([$email, $phone])),
            'website' => $website,
            'websiteLabel' => preg_replace('#^https?://#', '', rtrim($website, '/')),
        ];
    }

    private function absoluteUrl(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return '';
        }

        if ($this->isWebUrl($value)) {
            return $value;
        }

        return rtrim((string) config('app.url'), '/').'/'.ltrim($value, '/');
    }

    private function whatsAppUrl(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        return $digits !== '' ? 'https://wa.me/'.$digits : '';
    }

    private function isWebUrl(string $value): bool
    {
        if (! filter_var($value, FILTER_VALIDATE_URL)) {
            return false;
        }

        return in_array(strtolower((string) parse_url($value, PHP_URL_SCHEME)), ['http', 'https'], true);
    }

    private function humanizeMinutes(int $minutes): string
    {
        if ($minutes >= 1440 && $minutes % 1440 === 0) {
            $days = (int) ($minutes / 1440);

            return $days.' '.($days === 1 ? 'day' : 'days');
        }

        if ($minutes >= 60 && $minutes % 60 === 0) {
            $hours = (int) ($minutes / 60);

            return $hours.' '.($hours === 1 ? 'hour' : 'hours');
        }

        return $minutes.' '.($minutes === 1 ? 'minute' : 'minutes');
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function variables(object $booking): array
    {
        $timezone = $booking->attendee_timezone ?: $booking->timezone ?: 'UTC';
        $time = Carbon::parse($booking->starts_at, $booking->timezone ?: 'UTC')
            ->setTimezone($timezone)
            ->format('l, F j, Y \a\t g:i A T');

        return [
            '{{name}}' => (string) $booking->name,
            '{{email}}' => (string) $booking->email,
            '{{phone}}' => (string) ($booking->phone ?? ''),
            '{{time}}' => $time,
            '{{calendarName}}' => (string) ($booking->calendar_name ?: $booking->event_type_name ?: $booking->service),
            '{{location}}' => (string) ($booking->location_value ?? ''),
            '{{message}}' => (string) ($booking->message ?? ''),
        ];
    }

    private function render(string $template, array $variables): string
    {
        return strtr($template, $variables);
    }

    private function defaultConfirmationTemplate(): string
    {
        return "Hello {{name}},\n\nYour appointment has been successfully scheduled. Everything you need is included below.";
    }

    private function defaultAdminTemplate(): string
    {
        return 'A new appointment request has arrived. Review the attendee, schedule, and connection details below.';
    }

    private function defaultReminderTemplate(): string
    {
        return "Hello {{name}},\n\nThis is a reminder about your upcoming appointment. Use the connection details below when it is time to join.";
    }
}
