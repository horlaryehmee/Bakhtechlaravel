<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function overview()
    {
        $documents = DB::table('invoice_documents');
        $paid = (clone $documents)->where('status', 'paid');
        $viewed = DB::table('invoice_events')->where('event_type', 'document.viewed')->distinct('session_id')->count('session_id');
        $paymentClicks = DB::table('invoice_events')->where('event_type', 'payment.clicked')->count();

        return [
            'totals' => [
                'documents' => (clone $documents)->count(),
                'invoices' => (clone $documents)->where('type', 'invoice')->count(),
                'quotes' => (clone $documents)->where('type', 'quote')->count(),
                'receipts' => (clone $documents)->where('type', 'receipt')->count(),
                'paid' => (clone $documents)->where('status', 'paid')->count(),
                'unpaid' => (clone $documents)->whereIn('status', ['sent', 'viewed', 'overdue'])->count(),
            ],
            'revenue' => [
                'paid' => (float) $paid->sum('amount_paid'),
                'outstanding' => (float) (clone $documents)->whereNotIn('status', ['paid', 'cancelled', 'rejected'])->sum('balance_due'),
                'currency' => 'NGN',
            ],
            'conversion' => [
                'uniqueViews' => $viewed,
                'paymentClicks' => $paymentClicks,
                'viewToPaymentClickRate' => $viewed > 0 ? round(($paymentClicks / $viewed) * 100, 1) : 0,
            ],
            'recentEvents' => DB::table('invoice_events')
                ->leftJoin('invoice_documents', 'invoice_documents.id', '=', 'invoice_events.document_id')
                ->select('invoice_events.*', 'invoice_documents.number as document_number', 'invoice_documents.type as document_type')
                ->orderByDesc('invoice_events.created_at')
                ->limit(10)
                ->get()
                ->map(fn ($row) => $this->eventShape($row)),
        ];
    }

    public function clients()
    {
        return [
            'clients' => DB::table('invoice_clients')->orderBy('name')->get()->map(fn ($row) => $this->clientShape($row)),
        ];
    }

    public function documents(Request $request)
    {
        $rows = DB::table('invoice_documents')
            ->leftJoin('invoice_clients', 'invoice_clients.id', '=', 'invoice_documents.client_id')
            ->select('invoice_documents.*', 'invoice_clients.name as client_name', 'invoice_clients.email as client_email', 'invoice_clients.company_name as client_company_name')
            ->when($request->input('type'), fn ($query, $type) => $query->where('invoice_documents.type', $type))
            ->when($request->input('status'), fn ($query, $status) => $query->where('invoice_documents.status', $status))
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('invoice_documents.number', 'like', "%{$search}%")
                        ->orWhere('invoice_documents.title', 'like', "%{$search}%")
                        ->orWhere('invoice_clients.name', 'like', "%{$search}%")
                        ->orWhere('invoice_clients.email', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('invoice_documents.created_at')
            ->limit(100)
            ->get();

        return ['documents' => $rows->map(fn ($row) => $this->documentShape($row, false))];
    }

    public function document(int $id)
    {
        $document = $this->documentRow($id);
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        return ['document' => $this->documentShape($document, true)];
    }

    public function createDocument(Request $request)
    {
        $data = $this->validatedDocument($request);

        return response()->json(['document' => $this->saveDocument($data, null, $request)], 201);
    }

    public function updateDocument(Request $request, int $id)
    {
        if (!DB::table('invoice_documents')->where('id', $id)->exists()) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $data = $this->validatedDocument($request, $id);

        return ['document' => $this->saveDocument($data, $id, $request)];
    }

    public function sendDocument(Request $request, int $id)
    {
        $document = $this->documentRow($id);
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        DB::table('invoice_documents')->where('id', $id)->update([
            'status' => in_array($document->status, ['draft'], true) ? 'sent' : $document->status,
            'sent_at' => now(),
            'updated_at' => now(),
        ]);

        if ($document->client_email) {
            DB::table('invoice_email_logs')->insert([
                'document_id' => $id,
                'recipient_email' => $document->client_email,
                'subject' => ucfirst($document->type) . ' ' . $document->number . ' from Bakhtech Solutions',
                'template_key' => $document->type . '_sent',
                'status' => 'logged',
                'open_token' => (string) Str::uuid(),
                'click_token' => (string) Str::uuid(),
                'sent_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $this->trackEvent($id, 'document.sent', $request, ['recipient' => $document->client_email]);

        return ['document' => $this->documentShape($this->documentRow($id), true)];
    }

    public function publicDocument(Request $request, string $token)
    {
        $document = $this->publicDocumentRow($token);
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        return ['document' => $this->documentShape($document, true, true)];
    }

    public function trackPublicEvent(Request $request, string $token)
    {
        $document = $this->publicDocumentRow($token);
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $data = $request->validate([
            'eventType' => ['required', Rule::in(['document.viewed', 'payment.clicked', 'pdf.downloaded', 'time.spent'])],
            'sessionId' => ['nullable', 'string', 'max:80'],
            'timeSpentSeconds' => ['nullable', 'integer', 'min:0', 'max:86400'],
        ]);

        $this->trackEvent((int) $document->id, $data['eventType'], $request, [
            'timeSpentSeconds' => $data['timeSpentSeconds'] ?? null,
        ], $data['sessionId'] ?? null);

        if ($data['eventType'] === 'document.viewed' && !in_array($document->status, ['paid', 'accepted', 'rejected', 'cancelled'], true)) {
            DB::table('invoice_documents')->where('id', $document->id)->update([
                'status' => $document->status === 'draft' ? 'viewed' : 'viewed',
                'viewed_at' => $document->viewed_at ?: now(),
                'updated_at' => now(),
            ]);
        }

        return response()->noContent();
    }

    public function decideQuote(Request $request, string $token)
    {
        $document = $this->publicDocumentRow($token);
        if (!$document || $document->type !== 'quote') {
            return response()->json(['message' => 'Quote not found.'], 404);
        }

        $data = $request->validate([
            'decision' => ['required', Rule::in(['accepted', 'rejected'])],
        ]);

        DB::table('invoice_documents')->where('id', $document->id)->update([
            'status' => $data['decision'],
            $data['decision'] === 'accepted' ? 'accepted_at' : 'rejected_at' => now(),
            'updated_at' => now(),
        ]);

        $this->trackEvent((int) $document->id, 'quote.' . $data['decision'], $request);

        return ['document' => $this->documentShape($this->publicDocumentRow($token), true, true)];
    }

    public function initializePayment(Request $request, int $id)
    {
        $document = $this->documentRow($id);
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        if (!$document->payment_enabled || !$document->payment_gateway) {
            return response()->json(['message' => 'Payment is not enabled for this document.'], 422);
        }

        $reference = strtoupper($document->payment_gateway) . '-' . Str::upper(Str::random(14));
        DB::table('invoice_payments')->insert([
            'document_id' => $document->id,
            'gateway' => $document->payment_gateway,
            'reference' => $reference,
            'amount' => $document->balance_due,
            'currency' => $document->currency,
            'status' => 'pending',
            'authorization_url' => $this->gatewayCheckoutUrl($document, $reference),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->trackEvent((int) $document->id, 'payment.initialized', $request, ['gateway' => $document->payment_gateway]);

        return [
            'payment' => [
                'reference' => $reference,
                'gateway' => $document->payment_gateway,
                'amount' => (float) $document->balance_due,
                'currency' => $document->currency,
                'authorizationUrl' => $this->gatewayCheckoutUrl($document, $reference),
            ],
        ];
    }

    public function webhook(Request $request, string $gateway)
    {
        DB::table('invoice_events')->insert([
            'event_type' => 'payment.webhook_received',
            'actor_type' => 'system',
            'metadata_json' => json_encode(['gateway' => $gateway, 'payload' => $request->all()]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function printablePdf(Request $request, string $token)
    {
        $document = $this->publicDocumentRow($token);
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $this->trackEvent((int) $document->id, 'pdf.downloaded', $request);

        return response()->json([
            'message' => 'PDF renderer is ready to wire to Browsershot or DomPDF.',
            'document' => $this->documentShape($document, true, true),
        ]);
    }

    private function validatedDocument(Request $request, ?int $id = null): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['invoice', 'quote', 'receipt'])],
            'number' => ['nullable', 'string', 'max:80', Rule::unique('invoice_documents', 'number')->ignore($id)],
            'title' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['draft', 'sent', 'viewed', 'paid', 'overdue', 'accepted', 'rejected', 'cancelled'])],
            'currency' => ['required', 'string', 'size:3'],
            'exchangeRate' => ['nullable', 'numeric', 'min:0.000001'],
            'issueDate' => ['nullable', 'date'],
            'dueDate' => ['nullable', 'date'],
            'paymentGateway' => ['nullable', Rule::in(['paystack', 'flutterwave', 'manual'])],
            'paymentEnabled' => ['nullable', 'boolean'],
            'notes' => ['nullable', 'string'],
            'terms' => ['nullable', 'string'],
            'branding' => ['nullable', 'array'],
            'client' => ['required', 'array'],
            'client.id' => ['nullable', 'integer', 'exists:invoice_clients,id'],
            'client.name' => ['required', 'string', 'max:255'],
            'client.email' => ['nullable', 'email', 'max:255'],
            'client.phone' => ['nullable', 'string', 'max:60'],
            'client.companyName' => ['nullable', 'string', 'max:255'],
            'client.address' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.name' => ['required', 'string', 'max:255'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
            'items.*.unitPrice' => ['required', 'numeric', 'min:0'],
            'items.*.discountRate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.taxRate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);
    }

    private function saveDocument(array $data, ?int $id, Request $request): array
    {
        return DB::transaction(function () use ($data, $id, $request) {
            $clientId = $this->saveClient($data['client']);
            $totals = $this->calculateTotals($data['items']);
            $number = trim((string) ($data['number'] ?? '')) ?: $this->nextDocumentNumber($data['type']);
            $status = $data['status'] ?? 'draft';

            $payload = [
                'client_id' => $clientId,
                'type' => $data['type'],
                'number' => $number,
                'title' => $data['title'] ?? ucfirst($data['type']),
                'status' => $status,
                'currency' => strtoupper($data['currency']),
                'exchange_rate' => (float) ($data['exchangeRate'] ?? 1),
                'subtotal' => $totals['subtotal'],
                'discount_total' => $totals['discountTotal'],
                'tax_total' => $totals['taxTotal'],
                'total' => $totals['total'],
                'amount_paid' => $status === 'paid' ? $totals['total'] : 0,
                'balance_due' => $status === 'paid' ? 0 : $totals['total'],
                'issue_date' => $data['issueDate'] ?? now()->toDateString(),
                'due_date' => $data['dueDate'] ?? null,
                'payment_gateway' => $data['paymentGateway'] ?? null,
                'payment_enabled' => (bool) ($data['paymentEnabled'] ?? false),
                'branding_json' => json_encode($this->branding($data['branding'] ?? [])),
                'notes' => $data['notes'] ?? '',
                'terms' => $data['terms'] ?? '',
                'updated_at' => now(),
            ];

            if ($id) {
                DB::table('invoice_documents')->where('id', $id)->update($payload);
                DB::table('invoice_document_items')->where('document_id', $id)->delete();
                $documentId = $id;
                $event = 'document.updated';
            } else {
                $payload['public_token'] = (string) Str::uuid();
                $payload['created_by'] = $request->attributes->get('admin')->id ?? null;
                $payload['created_at'] = now();
                $documentId = DB::table('invoice_documents')->insertGetId($payload);
                $event = 'document.created';
            }

            foreach ($data['items'] as $index => $item) {
                $line = $this->calculateLine($item);
                DB::table('invoice_document_items')->insert([
                    'document_id' => $documentId,
                    'name' => $item['name'],
                    'description' => $item['description'] ?? '',
                    'quantity' => (float) $item['quantity'],
                    'unit_price' => (float) $item['unitPrice'],
                    'discount_rate' => (float) ($item['discountRate'] ?? 0),
                    'tax_rate' => (float) ($item['taxRate'] ?? 0),
                    'line_total' => $line['lineTotal'],
                    'sort_order' => $index + 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $this->trackEvent($documentId, $event, $request, ['number' => $number], null, 'owner');

            return $this->documentShape($this->documentRow($documentId), true);
        });
    }

    private function saveClient(array $client): int
    {
        $payload = [
            'name' => $client['name'],
            'email' => $client['email'] ?? '',
            'phone' => $client['phone'] ?? '',
            'company_name' => $client['companyName'] ?? '',
            'address' => $client['address'] ?? '',
            'updated_at' => now(),
        ];

        if (!empty($client['id'])) {
            DB::table('invoice_clients')->where('id', (int) $client['id'])->update($payload);
            return (int) $client['id'];
        }

        $existing = !empty($payload['email']) ? DB::table('invoice_clients')->where('email', $payload['email'])->first() : null;
        if ($existing) {
            DB::table('invoice_clients')->where('id', $existing->id)->update($payload);
            return (int) $existing->id;
        }

        $payload['created_at'] = now();
        return (int) DB::table('invoice_clients')->insertGetId($payload);
    }

    private function calculateTotals(array $items): array
    {
        $subtotal = 0;
        $discountTotal = 0;
        $taxTotal = 0;
        $total = 0;

        foreach ($items as $item) {
            $line = $this->calculateLine($item);
            $subtotal += $line['base'];
            $discountTotal += $line['discount'];
            $taxTotal += $line['tax'];
            $total += $line['lineTotal'];
        }

        return [
            'subtotal' => round($subtotal, 2),
            'discountTotal' => round($discountTotal, 2),
            'taxTotal' => round($taxTotal, 2),
            'total' => round($total, 2),
        ];
    }

    private function calculateLine(array $item): array
    {
        $base = (float) $item['quantity'] * (float) $item['unitPrice'];
        $discount = $base * ((float) ($item['discountRate'] ?? 0) / 100);
        $taxable = max(0, $base - $discount);
        $tax = $taxable * ((float) ($item['taxRate'] ?? 0) / 100);

        return [
            'base' => round($base, 2),
            'discount' => round($discount, 2),
            'tax' => round($tax, 2),
            'lineTotal' => round($taxable + $tax, 2),
        ];
    }

    private function nextDocumentNumber(string $type): string
    {
        $prefix = ['invoice' => 'INV', 'quote' => 'QUO', 'receipt' => 'RCT'][$type] ?? 'DOC';
        $count = DB::table('invoice_documents')->where('type', $type)->count() + 1;
        return $prefix . '-' . now()->format('Y') . '-' . str_pad((string) $count, 4, '0', STR_PAD_LEFT);
    }

    private function documentRow(int $id): ?object
    {
        return DB::table('invoice_documents')
            ->leftJoin('invoice_clients', 'invoice_clients.id', '=', 'invoice_documents.client_id')
            ->select('invoice_documents.*', 'invoice_clients.name as client_name', 'invoice_clients.email as client_email', 'invoice_clients.phone as client_phone', 'invoice_clients.company_name as client_company_name', 'invoice_clients.address as client_address')
            ->where('invoice_documents.id', $id)
            ->first();
    }

    private function publicDocumentRow(string $token): ?object
    {
        return DB::table('invoice_documents')
            ->leftJoin('invoice_clients', 'invoice_clients.id', '=', 'invoice_documents.client_id')
            ->select('invoice_documents.*', 'invoice_clients.name as client_name', 'invoice_clients.email as client_email', 'invoice_clients.phone as client_phone', 'invoice_clients.company_name as client_company_name', 'invoice_clients.address as client_address')
            ->where('invoice_documents.public_token', $token)
            ->first();
    }

    private function documentShape(object $row, bool $includeItems = true, bool $public = false): array
    {
        $items = $includeItems
            ? DB::table('invoice_document_items')->where('document_id', $row->id)->orderBy('sort_order')->get()->map(fn ($item) => $this->itemShape($item))->all()
            : [];
        $views = DB::table('invoice_events')->where('document_id', $row->id)->where('event_type', 'document.viewed');
        $paymentClicks = DB::table('invoice_events')->where('document_id', $row->id)->where('event_type', 'payment.clicked')->count();

        return [
            'id' => $public ? null : $row->id,
            'type' => $row->type,
            'number' => $row->number,
            'title' => $row->title ?: ucfirst($row->type),
            'publicToken' => $public ? null : $row->public_token,
            'publicUrl' => '/invoice/' . $row->public_token,
            'status' => $row->status,
            'currency' => $row->currency,
            'exchangeRate' => (float) $row->exchange_rate,
            'subtotal' => (float) $row->subtotal,
            'discountTotal' => (float) $row->discount_total,
            'taxTotal' => (float) $row->tax_total,
            'total' => (float) $row->total,
            'amountPaid' => (float) $row->amount_paid,
            'balanceDue' => (float) $row->balance_due,
            'issueDate' => (string) ($row->issue_date ?? ''),
            'dueDate' => (string) ($row->due_date ?? ''),
            'paymentGateway' => $row->payment_gateway ?? '',
            'paymentEnabled' => (bool) $row->payment_enabled,
            'notes' => $row->notes ?: '',
            'terms' => $row->terms ?: '',
            'branding' => $this->branding(json_decode($row->branding_json ?: '{}', true) ?: []),
            'client' => [
                'id' => $row->client_id,
                'name' => $row->client_name ?: '',
                'email' => $row->client_email ?: '',
                'phone' => $row->client_phone ?? '',
                'companyName' => $row->client_company_name ?? '',
                'address' => $row->client_address ?? '',
            ],
            'items' => $items,
            'analytics' => [
                'totalViews' => (clone $views)->count(),
                'uniqueViews' => (clone $views)->distinct('session_id')->count('session_id'),
                'paymentClicks' => $paymentClicks,
                'conversionRate' => (clone $views)->count() > 0 ? round(($paymentClicks / max(1, (clone $views)->count())) * 100, 1) : 0,
            ],
            'createdAt' => (string) $row->created_at,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function itemShape(object $row): array
    {
        return [
            'id' => $row->id,
            'name' => $row->name,
            'description' => $row->description ?: '',
            'quantity' => (float) $row->quantity,
            'unitPrice' => (float) $row->unit_price,
            'discountRate' => (float) $row->discount_rate,
            'taxRate' => (float) $row->tax_rate,
            'lineTotal' => (float) $row->line_total,
        ];
    }

    private function clientShape(object $row): array
    {
        return [
            'id' => $row->id,
            'name' => $row->name,
            'email' => $row->email ?: '',
            'phone' => $row->phone ?: '',
            'companyName' => $row->company_name ?: '',
            'address' => $row->address ?: '',
        ];
    }

    private function eventShape(object $row): array
    {
        return [
            'id' => $row->id,
            'documentId' => $row->document_id,
            'documentNumber' => $row->document_number ?? '',
            'documentType' => $row->document_type ?? '',
            'eventType' => $row->event_type,
            'deviceType' => $row->device_type ?: '',
            'metadata' => json_decode($row->metadata_json ?: '{}', true),
            'createdAt' => (string) $row->created_at,
        ];
    }

    private function branding(array $branding): array
    {
        return array_merge([
            'businessName' => 'Bakhtech Solutions',
            'logoUrl' => '/bakhtech-logo-light.png',
            'primaryColor' => '#ef4444',
            'accentColor' => '#12c8a0',
            'email' => 'solutions@bakhtech.com.ng',
            'phone' => '+234 708 637 2833',
            'address' => '',
        ], $branding);
    }

    private function gatewayCheckoutUrl(object $document, string $reference): string
    {
        $base = '/invoice/' . $document->public_token;
        return $base . '?payment=' . urlencode($document->payment_gateway) . '&reference=' . urlencode($reference);
    }

    private function trackEvent(int $documentId, string $eventType, Request $request, array $metadata = [], ?string $sessionId = null, string $actorType = 'anonymous'): void
    {
        if (!Schema::hasTable('invoice_events')) {
            return;
        }

        DB::table('invoice_events')->insert([
            'document_id' => $documentId,
            'event_type' => $eventType,
            'session_id' => $sessionId ?: (string) $request->input('sessionId', ''),
            'actor_type' => $actorType,
            'actor_id' => $request->attributes->get('admin')->id ?? null,
            'ip_address' => (string) $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'device_type' => $this->deviceType((string) $request->userAgent()),
            'metadata_json' => json_encode(array_filter($metadata, fn ($value) => $value !== null)),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function deviceType(string $userAgent): string
    {
        return preg_match('/Mobile|Android|iPhone|iPad/i', $userAgent) ? 'mobile' : 'desktop';
    }
}
