<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Dompdf\Dompdf;
use Dompdf\Options;
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

    public function generateInvoiceFromQuote(Request $request, string $token)
    {
        $quote = $this->publicDocumentRow($token);
        if (!$quote || $quote->type !== 'quote') {
            return response()->json(['message' => 'Quote not found.'], 404);
        }

        if (in_array($quote->status, ['rejected', 'cancelled'], true)) {
            return response()->json(['message' => 'An invoice cannot be generated from a rejected or cancelled quote.'], 422);
        }

        if (Schema::hasColumn('invoice_documents', 'source_quote_id')) {
            $existing = DB::table('invoice_documents')
                ->where('type', 'invoice')
                ->where('source_quote_id', $quote->id)
                ->orderByDesc('created_at')
                ->first();

            if ($existing) {
                $this->trackEvent((int) $quote->id, 'invoice.generated_existing_opened', $request, ['invoiceId' => $existing->id]);

                return [
                    'document' => $this->documentShape($this->documentRow((int) $existing->id), true, true),
                    'quote' => $this->documentShape($this->publicDocumentRow($token), true, true),
                    'alreadyGenerated' => true,
                ];
            }
        }

        $invoiceId = DB::transaction(function () use ($quote, $request) {
            DB::table('invoice_documents')->where('id', $quote->id)->update([
                'status' => 'accepted',
                'accepted_at' => $quote->accepted_at ?: now(),
                'updated_at' => now(),
            ]);

            $payload = [
                'client_id' => $quote->client_id,
                'type' => 'invoice',
                'number' => $this->nextDocumentNumber('invoice'),
                'title' => $quote->title ?: 'Invoice from quote ' . $quote->number,
                'public_token' => (string) Str::uuid(),
                'status' => 'sent',
                'currency' => $quote->currency,
                'exchange_rate' => $quote->exchange_rate,
                'subtotal' => $quote->subtotal,
                'discount_total' => $quote->discount_total,
                'tax_total' => $quote->tax_total,
                'total' => $quote->total,
                'amount_paid' => 0,
                'balance_due' => $quote->total,
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(14)->toDateString(),
                'sent_at' => now(),
                'payment_gateway' => $quote->payment_gateway,
                'payment_enabled' => (bool) $quote->payment_enabled,
                'branding_json' => $quote->branding_json,
                'notes' => $quote->notes,
                'terms' => $quote->terms,
                'created_by' => $quote->created_by,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if (Schema::hasColumn('invoice_documents', 'source_quote_id')) {
                $payload['source_quote_id'] = $quote->id;
            }

            $invoiceId = (int) DB::table('invoice_documents')->insertGetId($payload);

            $items = DB::table('invoice_document_items')->where('document_id', $quote->id)->orderBy('sort_order')->get();
            foreach ($items as $item) {
                DB::table('invoice_document_items')->insert([
                    'document_id' => $invoiceId,
                    'name' => $item->name,
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'discount_rate' => $item->discount_rate,
                    'tax_rate' => $item->tax_rate,
                    'line_total' => $item->line_total,
                    'sort_order' => $item->sort_order,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $this->trackEvent((int) $quote->id, 'invoice.generated_from_quote', $request, ['invoiceId' => $invoiceId], null, 'anonymous');
            $this->trackEvent($invoiceId, 'invoice.created_from_quote', $request, ['quoteId' => $quote->id, 'quoteNumber' => $quote->number], null, 'system');

            return $invoiceId;
        });

        return response()->json([
            'document' => $this->documentShape($this->documentRow($invoiceId), true, true),
            'quote' => $this->documentShape($this->publicDocumentRow($token), true, true),
            'alreadyGenerated' => false,
        ], 201);
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

    public function importFromJSON(Request $request)
    {
        $result = DB::transaction(function () use ($request) {
            $data = $request->all();
            $import = $this->normalizeInvoiceImport($data);
            $documentIdsBySourceId = [];
            $count = 0;

            foreach ($import['documents'] as $docData) {
                $number = trim((string) ($docData['number'] ?? $docData['quote_number'] ?? ''));
                if ($number === '') {
                    continue;
                }

                $clientId = $this->saveImportedClient($docData);
                $items = $docData['line_items'] ?? $docData['items'] ?? [];
                $totals = $this->importedTotals($docData, $items);
                $amountPaid = $this->money($docData['amount_paid'] ?? $docData['amountPaid'] ?? 0);
                $status = $this->importedStatus((string) ($docData['status'] ?? 'draft'), $amountPaid, $totals['total'], (string) ($docData['type'] ?? 'invoice'));
                $existing = DB::table('invoice_documents')->where('number', $number)->first();
                $sourceId = $docData['_source_id'] ?? $docData['id'] ?? null;

                $payload = [
                    'client_id' => $clientId,
                    'type' => in_array($docData['type'] ?? '', ['quote', 'invoice', 'receipt'], true) ? $docData['type'] : 'invoice',
                    'number' => $number,
                    'title' => $docData['title'] ?? ucfirst((string) ($docData['type'] ?? 'invoice')),
                    'status' => $status,
                    'currency' => strtoupper(substr((string) ($docData['currency'] ?? 'NGN'), 0, 3)),
                    'exchange_rate' => (float) ($docData['exchange_rate'] ?? $docData['exchangeRate'] ?? 1),
                    'subtotal' => $totals['subtotal'],
                    'discount_total' => $totals['discountTotal'],
                    'tax_total' => $totals['taxTotal'],
                    'total' => $totals['total'],
                    'amount_paid' => $amountPaid,
                    'balance_due' => max(0, $totals['total'] - $amountPaid),
                    'issue_date' => $this->dateOrNull($docData['issue_date'] ?? $docData['issueDate'] ?? null) ?: now()->toDateString(),
                    'due_date' => $this->dateOrNull($docData['due_date'] ?? $docData['dueDate'] ?? $docData['valid_until'] ?? null),
                    'sent_at' => $this->dateTimeOrNull($docData['sent_at'] ?? null),
                    'viewed_at' => $this->dateTimeOrNull($docData['viewed_at'] ?? null),
                    'paid_at' => $this->dateTimeOrNull($docData['paid_at'] ?? null),
                    'payment_gateway' => $docData['payment_gateway'] ?? $docData['paymentGateway'] ?? null,
                    'payment_enabled' => !empty($docData['payment_link_url']) || !empty($docData['paymentEnabled']),
                    'branding_json' => json_encode($this->branding([])),
                    'notes' => $this->cleanRichText($docData['notes'] ?? $docData['service_overview'] ?? ''),
                    'terms' => $this->cleanRichText($docData['terms'] ?? $docData['scope_of_service'] ?? ''),
                    'updated_at' => $this->dateTimeOrNull($docData['updated_at'] ?? $docData['updatedAt'] ?? null) ?: now(),
                ];

                if (Schema::hasColumn('invoice_documents', 'legacy_client_token')) {
                    $payload['legacy_client_token'] = $docData['client_token'] ?? $docData['clientToken'] ?? null;
                }

                if ($existing) {
                    DB::table('invoice_documents')->where('id', $existing->id)->update($payload);
                    DB::table('invoice_document_items')->where('document_id', $existing->id)->delete();
                    $documentId = (int) $existing->id;
                } else {
                    $payload['public_token'] = $this->uniqueImportedToken($docData['public_token'] ?? $docData['publicToken'] ?? null);
                    $payload['created_by'] = $request->attributes->get('admin')->id ?? null;
                    $payload['created_at'] = $this->dateTimeOrNull($docData['created_at'] ?? $docData['createdAt'] ?? null) ?: now();
                    $documentId = (int) DB::table('invoice_documents')->insertGetId($payload);
                }

                if ($sourceId !== null) {
                    $documentIdsBySourceId[(string) $sourceId] = $documentId;
                }

                foreach ($items as $index => $itemData) {
                    $this->insertImportedItem($documentId, $itemData, $index);
                }

                $count++;
            }

            $payments = $this->importPayments($import['payments'], $documentIdsBySourceId);
            $events = $this->importEvents($import['audit_logs'], $documentIdsBySourceId);
            $emails = $this->importEmailLogs($import['email_logs'], $documentIdsBySourceId);

            return [
                'documents' => $count,
                'payments' => $payments,
                'events' => $events,
                'emails' => $emails,
            ];
        });

        return [
            'imported' => $result['documents'],
            'summary' => $result,
            'message' => "Import completed successfully. {$result['documents']} documents imported.",
        ];
    }

    private function normalizeInvoiceImport(array $data): array
    {
        $tables = $data['tables'] ?? [];
        $documents = $tables['bk_quotes'] ?? $data['bk_quotes'] ?? $data['documents'] ?? (isset($data[0]) ? $data : [$data]);
        $lineItems = $tables['bk_line_items'] ?? $data['bk_line_items'] ?? [];
        $payments = $tables['bk_payments'] ?? $data['bk_payments'] ?? [];
        $auditLogs = $tables['bk_audit_logs'] ?? $data['bk_audit_logs'] ?? [];
        $emailLogs = $tables['bk_email_logs'] ?? $data['bk_email_logs'] ?? [];
        $itemsByQuote = [];

        foreach ($lineItems as $item) {
            if (!is_array($item)) {
                continue;
            }
            $quoteId = (string) ($item['quote_id'] ?? $item['document_id'] ?? '');
            if ($quoteId === '') {
                continue;
            }
            $itemsByQuote[$quoteId][] = $item;
        }

        $normalized = [];
        foreach ($documents as $doc) {
            if (!is_array($doc)) {
                continue;
            }
            $sourceId = $doc['id'] ?? null;
            if ($sourceId !== null && empty($doc['line_items']) && empty($doc['items']) && isset($itemsByQuote[(string) $sourceId])) {
                $doc['line_items'] = $itemsByQuote[(string) $sourceId];
            }
            $doc['_source_id'] = $sourceId;
            $doc['number'] = $doc['number'] ?? $doc['quote_number'] ?? null;
            $normalized[] = $doc;
        }

        return [
            'documents' => $normalized,
            'payments' => is_array($payments) ? $payments : [],
            'audit_logs' => is_array($auditLogs) ? $auditLogs : [],
            'email_logs' => is_array($emailLogs) ? $emailLogs : [],
        ];
    }

    private function saveImportedClient(array $docData): ?int
    {
        $client = $docData['client'] ?? [];
        $name = trim((string) ($docData['client_name'] ?? $client['name'] ?? 'Imported Client'));
        $email = trim((string) ($docData['client_email'] ?? $client['email'] ?? ''));
        $payload = [
            'name' => $name !== '' ? $name : 'Imported Client',
            'email' => $email,
            'phone' => $docData['client_phone'] ?? $client['phone'] ?? '',
            'company_name' => $docData['client_company'] ?? $client['companyName'] ?? '',
            'address' => $docData['client_address'] ?? $client['address'] ?? '',
            'metadata_json' => json_encode(['wordpress_client_id' => $docData['client_id'] ?? null]),
            'updated_at' => now(),
        ];

        $existing = $email !== ''
            ? DB::table('invoice_clients')->where('email', $email)->first()
            : DB::table('invoice_clients')->where('name', $payload['name'])->first();

        if ($existing) {
            DB::table('invoice_clients')->where('id', $existing->id)->update($payload);
            return (int) $existing->id;
        }

        $payload['created_at'] = now();
        return (int) DB::table('invoice_clients')->insertGetId($payload);
    }

    private function importedTotals(array $docData, array $items): array
    {
        $subtotal = $this->money($docData['subtotal'] ?? 0);
        $discountTotal = $this->money($docData['discount_total'] ?? $docData['discountTotal'] ?? 0);
        $taxTotal = $this->money($docData['tax_total'] ?? $docData['taxTotal'] ?? 0);
        $total = $this->money($docData['total_amount'] ?? $docData['total'] ?? 0);

        if ($subtotal <= 0 && !empty($items)) {
            foreach ($items as $item) {
                $subtotal += $this->money($item['quantity'] ?? 1) * $this->money($item['unit_price'] ?? $item['unitPrice'] ?? 0);
                $discountTotal += $this->money($item['discount_amount'] ?? 0);
                $taxTotal += $this->money($item['tax_amount'] ?? 0);
                $total += $this->money($item['line_total'] ?? 0);
            }
        }

        if ($total <= 0) {
            $total = max(0, $subtotal - $discountTotal + $taxTotal);
        }

        return [
            'subtotal' => round($subtotal, 2),
            'discountTotal' => round($discountTotal, 2),
            'taxTotal' => round($taxTotal, 2),
            'total' => round($total, 2),
        ];
    }

    private function insertImportedItem(int $documentId, array $itemData, int $index): void
    {
        $quantity = $this->money($itemData['quantity'] ?? 1);
        $unitPrice = $this->money($itemData['unit_price'] ?? $itemData['unitPrice'] ?? 0);
        $lineTotal = $this->money($itemData['line_total'] ?? 0);
        $discountRate = 0;
        $discountType = $itemData['discount_type'] ?? 'fixed';
        $discountValue = $this->money($itemData['discount_value'] ?? 0);

        if ($discountType === 'percent') {
            $discountRate = $discountValue;
        }

        if ($lineTotal <= 0) {
            $base = $quantity * $unitPrice;
            $discountAmount = $discountType === 'percent' ? $base * ($discountValue / 100) : $discountValue;
            $taxAmount = $this->money($itemData['tax_amount'] ?? 0);
            $lineTotal = max(0, $base - $discountAmount + $taxAmount);
        }

        DB::table('invoice_document_items')->insert([
            'document_id' => $documentId,
            'name' => $itemData['name'] ?? 'Imported item',
            'description' => $this->cleanRichText($itemData['description'] ?? ''),
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'discount_rate' => $discountRate,
            'tax_rate' => $this->money($itemData['tax_rate'] ?? $itemData['taxRate'] ?? 0),
            'line_total' => round($lineTotal, 2),
            'sort_order' => (int) ($itemData['sort_order'] ?? ($index + 1)),
            'created_at' => $this->dateTimeOrNull($itemData['created_at'] ?? null) ?: now(),
            'updated_at' => now(),
        ]);
    }

    private function importPayments(array $payments, array $documentIdsBySourceId): int
    {
        $count = 0;
        foreach ($payments as $payment) {
            if (!is_array($payment)) {
                continue;
            }
            $documentId = $documentIdsBySourceId[(string) ($payment['quote_id'] ?? '')] ?? null;
            if (!$documentId) {
                continue;
            }
            $reference = trim((string) ($payment['reference'] ?? '')) ?: 'WP-PAY-' . ($payment['id'] ?? Str::upper(Str::random(10)));
            if (DB::table('invoice_payments')->where('reference', $reference)->exists()) {
                continue;
            }
            DB::table('invoice_payments')->insert([
                'document_id' => $documentId,
                'gateway' => $payment['gateway'] ?? $payment['method'] ?? 'manual',
                'reference' => $reference,
                'amount' => $this->money($payment['amount'] ?? 0),
                'currency' => strtoupper(substr((string) ($payment['currency'] ?? 'NGN'), 0, 3)),
                'status' => $payment['status'] ?? 'completed',
                'authorization_url' => null,
                'gateway_response_json' => $payment['txn_payload'] ?? null,
                'paid_at' => ($payment['status'] ?? 'completed') === 'completed' ? ($this->dateTimeOrNull($payment['created_at'] ?? null) ?: now()) : null,
                'created_at' => $this->dateTimeOrNull($payment['created_at'] ?? null) ?: now(),
                'updated_at' => now(),
            ]);
            $count++;
        }

        return $count;
    }

    private function importEvents(array $auditLogs, array $documentIdsBySourceId): int
    {
        $count = 0;
        foreach ($auditLogs as $log) {
            if (!is_array($log)) {
                continue;
            }
            $documentId = $documentIdsBySourceId[(string) ($log['quote_id'] ?? '')] ?? null;
            if (!$documentId) {
                continue;
            }
            DB::table('invoice_events')->insert([
                'document_id' => $documentId,
                'event_type' => $this->importedEventType((string) ($log['action'] ?? 'document.updated')),
                'session_id' => null,
                'actor_type' => !empty($log['user_id']) ? 'owner' : 'anonymous',
                'actor_id' => $log['user_id'] ?? null,
                'ip_address' => $log['ip_address'] ?? null,
                'user_agent' => $log['user_agent'] ?? null,
                'device_type' => $this->deviceType((string) ($log['user_agent'] ?? '')),
                'metadata_json' => json_encode([
                    'description' => $log['description'] ?? '',
                    'oldValue' => $log['old_value'] ?? null,
                    'newValue' => $log['new_value'] ?? null,
                ]),
                'created_at' => $this->dateTimeOrNull($log['created_at'] ?? null) ?: now(),
                'updated_at' => now(),
            ]);
            $count++;
        }

        return $count;
    }

    private function importEmailLogs(array $emailLogs, array $documentIdsBySourceId): int
    {
        $count = 0;
        foreach ($emailLogs as $log) {
            if (!is_array($log)) {
                continue;
            }
            $documentId = $documentIdsBySourceId[(string) ($log['quote_id'] ?? '')] ?? null;
            if (!$documentId || empty($log['recipient_email'])) {
                continue;
            }
            DB::table('invoice_email_logs')->insert([
                'document_id' => $documentId,
                'recipient_email' => $log['recipient_email'],
                'subject' => $log['subject'] ?? 'Imported email',
                'template_key' => $log['template_name'] ?? 'imported',
                'status' => $log['status'] ?? 'sent',
                'open_token' => (string) Str::uuid(),
                'click_token' => (string) Str::uuid(),
                'sent_at' => $this->dateTimeOrNull($log['sent_at'] ?? null),
                'opened_at' => $this->dateTimeOrNull($log['opened_at'] ?? null),
                'created_at' => $this->dateTimeOrNull($log['created_at'] ?? null) ?: now(),
                'updated_at' => now(),
            ]);
            $count++;
        }

        return $count;
    }

    private function importedStatus(string $status, float $amountPaid, float $total, string $type): string
    {
        $status = strtolower($status);
        if ($status === 'declined') {
            return 'rejected';
        }
        if ($status === 'partial') {
            return $amountPaid >= $total && $total > 0 ? 'paid' : 'sent';
        }
        if ($type === 'quote' && $status === 'paid') {
            return 'accepted';
        }

        return in_array($status, ['draft', 'sent', 'viewed', 'paid', 'overdue', 'accepted', 'rejected', 'cancelled'], true)
            ? $status
            : 'draft';
    }

    private function importedEventType(string $action): string
    {
        return match (strtolower($action)) {
            'viewed' => 'document.viewed',
            'sent' => 'document.sent',
            'paid' => 'payment.completed',
            'accepted' => 'quote.accepted',
            'declined', 'rejected' => 'quote.rejected',
            default => 'document.' . preg_replace('/[^a-z0-9_]+/i', '_', strtolower($action)),
        };
    }

    private function cleanRichText(mixed $value): string
    {
        $text = trim((string) $value);
        if ($text === '') {
            return '';
        }

        for ($i = 0; $i < 3; $i++) {
            $decoded = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if ($decoded === $text) {
                break;
            }
            $text = $decoded;
        }

        $text = preg_replace('/<(script|style)\b[^>]*>.*?<\/\1>/is', '', $text) ?: '';
        $text = preg_replace('/\s+on[a-z]+\s*=\s*("[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $text) ?: '';
        $text = preg_replace('/\s+(href|src)\s*=\s*("|\')?\s*javascript:[^"\'>\s]+("|\')?/i', '', $text) ?: '';

        return trim(strip_tags($text, '<p><br><ul><ol><li><strong><b><em><i><u><h2><h3><h4>'));
    }

    private function documentPdfHtml(array $document): string
    {
        $brand = $document['branding'];
        $client = $document['client'];
        $currency = $document['currency'];
        $formatMoney = fn ($amount) => e($currency . ' ' . number_format((float) $amount, 2));
        $items = '';

        foreach ($document['items'] as $item) {
            $items .= '<tr>'
                . '<td><strong>' . e($item['name']) . '</strong>' . ($item['description'] ? '<div class="muted rich">' . $item['description'] . '</div>' : '') . '</td>'
                . '<td class="right">' . e((string) $item['quantity']) . '</td>'
                . '<td class="right">' . $formatMoney($item['unitPrice']) . '</td>'
                . '<td class="right">' . ((float) $item['discountRate'] > 0 ? e((string) $item['discountRate']) . '%' : 'None') . '</td>'
                . '<td class="right">' . e((string) $item['taxRate']) . '%</td>'
                . '<td class="right"><strong>' . $formatMoney($item['lineTotal'] ?? 0) . '</strong></td>'
                . '</tr>';
        }

        $notes = $document['notes'] ? '<section><h3>Service Overview</h3><div class="rich">' . $document['notes'] . '</div></section>' : '';
        $terms = $document['terms'] ? '<section><h3>Terms</h3><div class="rich">' . $document['terms'] . '</div></section>' : '';

        return '<!doctype html><html><head><meta charset="utf-8"><style>
            @page { margin: 32px; }
            body { font-family: DejaVu Sans, Arial, sans-serif; color: #18181b; font-size: 12px; line-height: 1.55; }
            h1,h2,h3,p { margin: 0; }
            .top { border-bottom: 2px solid #18181b; padding-bottom: 18px; margin-bottom: 22px; }
            .brand { color: ' . e($brand['primaryColor']) . '; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            .title { font-size: 30px; line-height: 1.1; margin-top: 7px; }
            .status { display: inline-block; margin-top: 8px; padding: 4px 9px; border-radius: 20px; background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .grid { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .grid td { width: 50%; vertical-align: top; padding-right: 18px; }
            .box { border: 1px solid #e7e5e4; padding: 14px; border-radius: 6px; }
            .label { color: #71717a; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
            .muted { color: #52525b; }
            table.items { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .items th { background: #f5f5f4; color: #52525b; font-size: 10px; text-transform: uppercase; text-align: left; padding: 9px; }
            .items td { border-bottom: 1px solid #e7e5e4; padding: 10px 9px; vertical-align: top; }
            .right { text-align: right; }
            section { margin-top: 20px; }
            section h3 { color: ' . e($brand['primaryColor']) . '; font-size: 11px; text-transform: uppercase; margin-bottom: 7px; }
            .rich ul, .rich ol { margin: 6px 0 8px 18px; padding: 0; }
            .totals { width: 260px; margin-left: auto; margin-top: 20px; border-collapse: collapse; }
            .totals td { padding: 7px 0; border-bottom: 1px solid #e7e5e4; }
            .totals .final td { border-bottom: 0; font-size: 16px; font-weight: 700; color: ' . e($brand['primaryColor']) . '; }
        </style></head><body>
            <div class="top">
                <div class="brand">' . e($brand['businessName']) . '</div>
                <h1 class="title">' . e(ucfirst($document['type'])) . ' #' . e($document['number']) . '</h1>
                <span class="status">' . e($document['status']) . '</span>
            </div>
            <table class="grid"><tr>
                <td><div class="box"><div class="label">From</div><strong>' . e($brand['businessName']) . '</strong><br><span class="muted">' . e($brand['email']) . '<br>' . e($brand['phone']) . '<br>' . nl2br(e($brand['address'])) . '</span></div></td>
                <td><div class="box"><div class="label">Prepared For</div><strong>' . e($client['name']) . '</strong><br><span class="muted">' . e($client['companyName']) . '<br>' . e($client['email']) . '<br>' . nl2br(e($client['address'])) . '</span></div></td>
            </tr></table>
            ' . $notes . $terms . '
            <section><h3>Line Items</h3><table class="items"><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Discount</th><th class="right">Tax</th><th class="right">Total</th></tr></thead><tbody>' . $items . '</tbody></table></section>
            <table class="totals">
                <tr><td>Subtotal</td><td class="right">' . $formatMoney($document['subtotal']) . '</td></tr>
                <tr><td>Discount</td><td class="right">' . $formatMoney($document['discountTotal']) . '</td></tr>
                <tr><td>Tax</td><td class="right">' . $formatMoney($document['taxTotal']) . '</td></tr>
                <tr class="final"><td>' . ($document['type'] === 'quote' ? 'Total' : 'Balance') . '</td><td class="right">' . $formatMoney($document['type'] === 'quote' ? $document['total'] : $document['balanceDue']) . '</td></tr>
            </table>
        </body></html>';
    }

    private function money(mixed $value): float
    {
        return round((float) preg_replace('/[^\d.\-]/', '', (string) $value), 2);
    }

    private function dateOrNull(mixed $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function dateTimeOrNull(mixed $value): mixed
    {
        if (empty($value)) {
            return null;
        }

        try {
            return \Carbon\Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function uniqueImportedToken(?string $token): string
    {
        $candidate = $token ?: (string) Str::uuid();
        if (!DB::table('invoice_documents')->where('public_token', $candidate)->exists()) {
            return $candidate;
        }

        return (string) Str::uuid();
    }

    public function printablePdf(Request $request, string $token)
    {
        $document = $this->publicDocumentRow($token);
        if (!$document) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $this->trackEvent((int) $document->id, 'pdf.downloaded', $request);

        $shape = $this->documentShape($document, true, true);
        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');

        $pdf = new Dompdf($options);
        $pdf->loadHtml($this->documentPdfHtml($shape));
        $pdf->setPaper('A4', 'portrait');
        $pdf->render();

        $filename = Str::slug($shape['type'] . '-' . $shape['number']) . '.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
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
                'notes' => $this->cleanRichText($data['notes'] ?? ''),
                'terms' => $this->cleanRichText($data['terms'] ?? ''),
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
                    'description' => $this->cleanRichText($item['description'] ?? ''),
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
        $settings = $this->siteSettings();
        $prefix = match ($type) {
            'invoice' => (string) ($settings['invoice_prefix'] ?? 'INV-'),
            'quote' => (string) ($settings['quote_prefix'] ?? 'QT-'),
            'receipt' => 'RCT-',
            default => 'DOC-',
        };
        $start = max(1, (int) ($settings[$type === 'receipt' ? 'receipt_starting_number' : 'starting_number'] ?? 1000));
        $count = DB::table('invoice_documents')->where('type', $type)->count();

        return rtrim($prefix, '-') . '-' . ($start + $count);
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
            ->where(function ($query) use ($token) {
                $query->where('invoice_documents.public_token', $token);

                if (Schema::hasColumn('invoice_documents', 'legacy_client_token')) {
                    $query->orWhere('invoice_documents.legacy_client_token', $token);
                }
            })
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
            'notes' => $this->cleanRichText($row->notes ?: ''),
            'terms' => $this->cleanRichText($row->terms ?: ''),
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
            'generatedInvoice' => $row->type === 'quote' ? $this->generatedInvoiceShape((int) $row->id) : null,
            'createdAt' => (string) $row->created_at,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function generatedInvoiceShape(int $quoteId): ?array
    {
        if (!Schema::hasColumn('invoice_documents', 'source_quote_id')) {
            return null;
        }

        $invoice = DB::table('invoice_documents')
            ->where('type', 'invoice')
            ->where('source_quote_id', $quoteId)
            ->orderByDesc('created_at')
            ->first();

        if (!$invoice) {
            return null;
        }

        return [
            'number' => $invoice->number,
            'publicUrl' => '/invoice/' . $invoice->public_token,
            'status' => $invoice->status,
            'total' => (float) $invoice->total,
        ];
    }

    private function itemShape(object $row): array
    {
        return [
            'id' => $row->id,
            'name' => $row->name,
            'description' => $this->cleanRichText($row->description ?: ''),
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
        $settings = $this->siteSettings();

        return array_merge([
            'businessName' => $settings['company_name'] ?? 'Bakhtech Solutions',
            'logoUrl' => $settings['company_logo'] ?? '/bakhtech-logo-light.png',
            'primaryColor' => '#ef4444',
            'accentColor' => '#12c8a0',
            'email' => $settings['company_email'] ?? 'solutions@bakhtech.com.ng',
            'phone' => $settings['company_phone'] ?? '+234 708 637 2833',
            'address' => $settings['company_address'] ?? '',
        ], $branding);
    }

    private function siteSettings(): array
    {
        if (!Schema::hasTable('settings')) {
            return [];
        }

        return DB::table('settings')->pluck('value', 'key')->all();
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
