<?php

namespace App\Services;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class InvoicePaymentService
{
    public function initialize(object $document, float $amount): array
    {
        $gateway = strtolower((string) $document->payment_gateway);
        $amount = round(min($amount, (float) $document->balance_due), 2);

        if (!in_array($gateway, ['paystack', 'flutterwave'], true) || $amount <= 0) {
            throw new HttpResponseException(response()->json(['message' => 'Online payment is not available for this document.'], 422));
        }

        if (empty($document->client_email)) {
            throw new HttpResponseException(response()->json(['message' => 'A client email address is required for online payment.'], 422));
        }

        $reference = strtoupper($gateway).'-'.Str::upper(Str::random(20));
        $payment = $gateway === 'paystack'
            ? $this->initializePaystack($document, $reference, $amount)
            : $this->initializeFlutterwave($document, $reference, $amount);

        DB::table('invoice_payments')->insert([
            'document_id' => $document->id,
            'gateway' => $gateway,
            'reference' => $reference,
            'amount' => $amount,
            'currency' => strtoupper((string) $document->currency),
            'status' => 'pending',
            'authorization_url' => $payment['authorizationUrl'],
            'gateway_response_json' => json_encode($payment['gatewayResponse']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'reference' => $reference,
            'gateway' => $gateway,
            'amount' => $amount,
            'currency' => strtoupper((string) $document->currency),
            'authorizationUrl' => $payment['authorizationUrl'],
        ];
    }

    public function handleWebhook(Request $request, string $gateway): array
    {
        $gateway = strtolower($gateway);
        $payload = $request->json()->all();

        if ($gateway === 'paystack') {
            $this->verifyPaystackSignature($request);
            if (($payload['event'] ?? '') !== 'charge.success') {
                return ['processed' => false, 'newlyProcessed' => false, 'documentId' => null];
            }

            $data = $payload['data'] ?? [];
            return $this->reconcile(
                $gateway,
                (string) ($data['reference'] ?? ''),
                ((float) ($data['amount'] ?? 0)) / 100,
                (string) ($data['currency'] ?? ''),
                (string) ($data['status'] ?? ''),
                $data,
            );
        }

        if ($gateway === 'flutterwave') {
            $this->verifyFlutterwaveSignature($request);
            $data = $payload['data'] ?? [];
            return $this->reconcile(
                $gateway,
                (string) ($data['tx_ref'] ?? ''),
                (float) ($data['amount'] ?? 0),
                (string) ($data['currency'] ?? ''),
                (string) ($data['status'] ?? ''),
                $data,
            );
        }

        throw new HttpResponseException(response()->json(['message' => 'Unsupported payment gateway.'], 404));
    }

    public function verifyReturn(object $document, string $reference, ?string $transactionId = null): array
    {
        $payment = DB::table('invoice_payments')
            ->where('document_id', $document->id)
            ->where('reference', $reference)
            ->first();

        if (!$payment) {
            throw new HttpResponseException(response()->json(['message' => 'Payment reference not found for this invoice.'], 404));
        }

        if ($payment->status === 'paid') {
            return [
                'processed' => true,
                'newlyProcessed' => false,
                'documentId' => (int) $payment->document_id,
                'reference' => (string) $payment->reference,
            ];
        }

        if ($payment->gateway === 'paystack') {
            $response = Http::withToken($this->gatewaySecret('paystack'))
                ->acceptJson()
                ->get('https://api.paystack.co/transaction/verify/'.rawurlencode($reference));

            if (!$response->successful() || !$response->json('status')) {
                throw new HttpResponseException(response()->json([
                    'message' => $response->json('message') ?: 'Unable to verify Paystack payment.',
                ], 502));
            }

            $data = $response->json('data', []);

            return $this->reconcile(
                'paystack',
                (string) ($data['reference'] ?? ''),
                ((float) ($data['amount'] ?? 0)) / 100,
                (string) ($data['currency'] ?? ''),
                (string) ($data['status'] ?? ''),
                $data,
            );
        }

        if ($payment->gateway === 'flutterwave') {
            if (!$transactionId) {
                throw new HttpResponseException(response()->json(['message' => 'Flutterwave transaction ID is required.'], 422));
            }

            $response = Http::withToken($this->gatewaySecret('flutterwave'))
                ->acceptJson()
                ->get('https://api.flutterwave.com/v3/transactions/'.rawurlencode($transactionId).'/verify');

            if (!$response->successful() || $response->json('status') !== 'success') {
                throw new HttpResponseException(response()->json([
                    'message' => $response->json('message') ?: 'Unable to verify Flutterwave payment.',
                ], 502));
            }

            $data = $response->json('data', []);

            return $this->reconcile(
                'flutterwave',
                (string) ($data['tx_ref'] ?? ''),
                (float) ($data['amount'] ?? 0),
                (string) ($data['currency'] ?? ''),
                (string) ($data['status'] ?? ''),
                $data,
            );
        }

        throw new HttpResponseException(response()->json(['message' => 'Unsupported payment gateway.'], 404));
    }

    private function initializePaystack(object $document, string $reference, float $amount): array
    {
        $response = Http::withToken($this->gatewaySecret('paystack'))
            ->acceptJson()
            ->post('https://api.paystack.co/transaction/initialize', [
                'email' => $document->client_email,
                'amount' => (int) round($amount * 100),
                'currency' => strtoupper((string) $document->currency),
                'reference' => $reference,
                'callback_url' => $this->callbackUrl($document, $reference),
                'metadata' => ['invoice_id' => $document->id, 'invoice_number' => $document->number],
            ]);

        if (!$response->successful() || !$response->json('status')) {
            throw new HttpResponseException(response()->json([
                'message' => $response->json('message') ?: 'Unable to initialize Paystack payment.',
            ], 502));
        }

        return [
            'authorizationUrl' => (string) $response->json('data.authorization_url', ''),
            'gatewayResponse' => $response->json('data', []),
        ];
    }

    private function initializeFlutterwave(object $document, string $reference, float $amount): array
    {
        $response = Http::withToken($this->gatewaySecret('flutterwave'))
            ->acceptJson()
            ->post('https://api.flutterwave.com/v3/payments', [
                'tx_ref' => $reference,
                'amount' => $amount,
                'currency' => strtoupper((string) $document->currency),
                'redirect_url' => $this->callbackUrl($document, $reference),
                'customer' => [
                    'email' => $document->client_email,
                    'name' => $document->client_name ?: 'Client',
                    'phonenumber' => $document->client_phone ?: '',
                ],
                'customizations' => [
                    'title' => 'Invoice '.$document->number,
                    'description' => $document->title ?: 'Invoice payment',
                ],
                'meta' => ['invoice_id' => $document->id, 'invoice_number' => $document->number],
            ]);

        if (!$response->successful() || $response->json('status') !== 'success') {
            throw new HttpResponseException(response()->json([
                'message' => $response->json('message') ?: 'Unable to initialize Flutterwave payment.',
            ], 502));
        }

        return [
            'authorizationUrl' => (string) $response->json('data.link', ''),
            'gatewayResponse' => $response->json('data', []),
        ];
    }

    private function reconcile(string $gateway, string $reference, float $amount, string $currency, string $status, array $gatewayData): array
    {
        if ($reference === '' || !in_array(strtolower($status), ['success', 'successful'], true)) {
            return ['processed' => false, 'newlyProcessed' => false, 'documentId' => null];
        }

        return DB::transaction(function () use ($gateway, $reference, $amount, $currency, $gatewayData) {
            $payment = DB::table('invoice_payments')
                ->where('gateway', $gateway)
                ->where('reference', $reference)
                ->lockForUpdate()
                ->first();

            if (!$payment) {
                throw new HttpResponseException(response()->json(['message' => 'Payment reference not found.'], 404));
            }

            if ($payment->status === 'paid') {
                return [
                    'processed' => true,
                    'newlyProcessed' => false,
                    'documentId' => (int) $payment->document_id,
                    'reference' => (string) $payment->reference,
                ];
            }

            if (strtoupper($currency) !== strtoupper((string) $payment->currency) || abs($amount - (float) $payment->amount) > 0.01) {
                throw new HttpResponseException(response()->json(['message' => 'Payment amount or currency does not match.'], 422));
            }

            $document = DB::table('invoice_documents')->where('id', $payment->document_id)->lockForUpdate()->first();
            if (!$document) {
                throw new HttpResponseException(response()->json(['message' => 'Invoice not found.'], 404));
            }

            $newAmountPaid = min((float) $document->total, (float) $document->amount_paid + (float) $payment->amount);
            $newBalanceDue = max(0, (float) $document->total - $newAmountPaid);
            $documentStatus = $newBalanceDue <= 0 ? 'paid' : 'partial';

            DB::table('invoice_payments')->where('id', $payment->id)->update([
                'status' => 'paid',
                'gateway_response_json' => json_encode($gatewayData),
                'paid_at' => now(),
                'updated_at' => now(),
            ]);

            DB::table('invoice_documents')->where('id', $document->id)->update([
                'amount_paid' => $newAmountPaid,
                'balance_due' => $newBalanceDue,
                'status' => $documentStatus,
                'paid_at' => $documentStatus === 'paid' ? now() : null,
                'updated_at' => now(),
            ]);

            DB::table('invoice_events')->insert([
                'document_id' => $document->id,
                'event_type' => 'payment.completed',
                'actor_type' => 'system',
                'metadata_json' => json_encode([
                    'gateway' => $gateway,
                    'reference' => $reference,
                    'amount' => (float) $payment->amount,
                    'currency' => $payment->currency,
                ]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return [
                'processed' => true,
                'newlyProcessed' => true,
                'documentId' => (int) $document->id,
                'reference' => (string) $payment->reference,
            ];
        });
    }

    private function verifyPaystackSignature(Request $request): void
    {
        $expected = hash_hmac('sha512', $request->getContent(), $this->gatewaySecret('paystack'));
        $provided = (string) $request->header('x-paystack-signature', '');

        if ($provided === '' || !hash_equals($expected, $provided)) {
            throw new HttpResponseException(response()->json(['message' => 'Invalid webhook signature.'], 401));
        }
    }

    private function verifyFlutterwaveSignature(Request $request): void
    {
        $secret = (string) config('security.flutterwave_webhook_secret');
        $provided = (string) $request->header('verif-hash', '');

        if ($secret === '' || $provided === '' || !hash_equals($secret, $provided)) {
            throw new HttpResponseException(response()->json(['message' => 'Invalid webhook signature.'], 401));
        }
    }

    private function gatewaySecret(string $gateway): string
    {
        $settings = DB::table('settings')->pluck('value', 'key');
        $mode = ($settings['gateway_mode'] ?? 'test') === 'live' ? 'live' : 'test';
        $settingPrefix = $gateway === 'flutterwave' ? 'flutter' : $gateway;
        $key = trim((string) ($settings["{$settingPrefix}_secret_{$mode}"] ?? ''));

        if ($key === '' && $gateway === 'flutterwave') {
            $key = trim((string) ($settings["flutterwave_secret_{$mode}"] ?? $settings['flutterwave_secret_key'] ?? ''));
        }

        if ($key === '' && $gateway === 'paystack') {
            $key = (string) config('services.paystack.secret_key');
        }

        if ($key === '' && $gateway === 'flutterwave') {
            $key = (string) config('services.flutterwave.secret_key');
        }

        if ($key === '') {
            throw new HttpResponseException(response()->json([
                'message' => ucfirst($gateway).' '.$mode.' secret key is not configured.',
            ], 422));
        }

        return $key;
    }

    private function callbackUrl(object $document, string $reference): string
    {
        return url('/invoice/'.$document->public_token).'?payment=return&reference='.rawurlencode($reference);
    }
}
