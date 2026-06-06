<?php

namespace App\Services;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class PaystackPaymentService
{
    public function initialize(int $bookingId, string $email): array
    {
        $booking = DB::table('bookings')->where('id', $bookingId)->first();
        if (!$booking || strtolower((string) $booking->email) !== strtolower($email)) {
            throw new HttpResponseException(response()->json(['message' => 'Booking not found.'], 404));
        }

        if ($this->setting('paystack_enabled') !== 'true' || $this->setting('payment_provider') !== 'paystack') {
            throw new HttpResponseException(response()->json(['message' => 'Paystack payments are not enabled.'], 422));
        }

        if ((float) $booking->price_amount <= 0) {
            throw new HttpResponseException(response()->json(['message' => 'This booking does not require payment.'], 422));
        }

        if ($booking->payment_status === 'paid') {
            return [
                'status' => 'paid',
                'reference' => $booking->payment_reference,
                'authorizationUrl' => $booking->payment_authorization_url,
                'accessCode' => $booking->payment_access_code,
            ];
        }

        $reference = $booking->payment_reference ?: 'bkt-' . $booking->id . '-' . Str::lower(Str::random(12));
        $response = Http::withToken($this->secretKey())
            ->acceptJson()
            ->post('https://api.paystack.co/transaction/initialize', [
                'email' => $booking->email,
                'amount' => $this->toSubunit((float) $booking->price_amount, (string) $booking->currency),
                'currency' => $booking->currency ?: $this->setting('currency', 'NGN'),
                'reference' => $reference,
                'callback_url' => $this->setting('paystack_callback_url') ?: config('services.paystack.callback_url'),
                'channels' => $this->channels(),
                'metadata' => [
                    'booking_id' => $booking->id,
                    'customer_name' => $booking->name,
                    'service' => $booking->service,
                ],
            ]);

        if (!$response->successful() || !$response->json('status')) {
            throw new HttpResponseException(response()->json([
                'message' => $response->json('message') ?: 'Unable to initialize Paystack payment.',
            ], 502));
        }

        $data = $response->json('data');
        DB::table('bookings')->where('id', $booking->id)->update([
            'payment_provider' => 'paystack',
            'payment_status' => 'pending',
            'payment_reference' => $reference,
            'payment_authorization_url' => $data['authorization_url'] ?? null,
            'payment_access_code' => $data['access_code'] ?? null,
            'updated_at' => now(),
        ]);

        return [
            'status' => 'pending',
            'reference' => $reference,
            'authorizationUrl' => $data['authorization_url'] ?? '',
            'accessCode' => $data['access_code'] ?? '',
        ];
    }

    public function verify(string $reference): array
    {
        $booking = DB::table('bookings')->where('payment_reference', $reference)->first();
        if (!$booking) {
            throw new HttpResponseException(response()->json(['message' => 'Payment reference not found.'], 404));
        }

        $response = Http::withToken($this->secretKey())
            ->acceptJson()
            ->get('https://api.paystack.co/transaction/verify/' . rawurlencode($reference));

        if (!$response->successful() || !$response->json('status')) {
            throw new HttpResponseException(response()->json([
                'message' => $response->json('message') ?: 'Unable to verify Paystack payment.',
            ], 502));
        }

        $data = $response->json('data');
        $paid = ($data['status'] ?? '') === 'success';

        DB::table('bookings')->where('id', $booking->id)->update([
            'payment_status' => $paid ? 'paid' : ($data['status'] ?? 'failed'),
            'paid_at' => $paid ? now() : $booking->paid_at,
            'status' => $paid && in_array($booking->status, ['pending', 'open'], true) ? 'confirmed' : $booking->status,
            'updated_at' => now(),
        ]);

        return [
            'bookingId' => $booking->id,
            'reference' => $reference,
            'status' => $data['status'] ?? 'unknown',
            'paid' => $paid,
            'amount' => ($data['amount'] ?? 0) / 100,
            'currency' => $data['currency'] ?? $booking->currency,
        ];
    }

    private function secretKey(): string
    {
        $key = $this->setting('paystack_secret_key') ?: config('services.paystack.secret_key');
        if (!$key) {
            throw new HttpResponseException(response()->json(['message' => 'Paystack secret key is not configured.'], 422));
        }

        return $key;
    }

    private function channels(): array
    {
        return collect(explode(',', (string) $this->setting('paystack_channels', 'card,bank,ussd,bank_transfer')))
            ->map(fn ($channel) => trim($channel))
            ->filter()
            ->values()
            ->all();
    }

    private function toSubunit(float $amount, string $currency): int
    {
        $zeroDecimal = ['JPY'];
        return in_array(strtoupper($currency), $zeroDecimal, true) ? (int) round($amount) : (int) round($amount * 100);
    }

    private function setting(string $key, ?string $fallback = null): ?string
    {
        return DB::table('booking_settings')->where('key', $key)->value('value') ?? $fallback;
    }
}
