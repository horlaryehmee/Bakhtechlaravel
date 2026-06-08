<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
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

    public function clients(Request $request)
    {
        $perPage = $this->perPage($request);
        $page = max(1, (int) $request->input('page', 1));
        $query = DB::table('invoice_clients')
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                });
            });
        $total = (clone $query)->count();
        $rows = $query
            ->orderBy('name')
            ->forPage($page, $perPage)
            ->get();

        return [
            'clients' => $rows->map(fn ($row) => $this->clientShape($row)),
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    public function documents(Request $request)
    {
        $perPage = $this->perPage($request);
        $page = max(1, (int) $request->input('page', 1));
        $query = DB::table('invoice_documents')
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
            });
        $total = (clone $query)->count();
        $rows = $query
            ->orderByDesc('invoice_documents.created_at')
            ->forPage($page, $perPage)
            ->get();

        return [
            'documents' => $rows->map(fn ($row) => $this->documentShape($row, false)),
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
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
        $document = $this->saveDocument($data, null, $request);

        $this->sendInvoiceNotification((int) $document['id'], $request, $document['type'] . '_created');

        return response()->json(['document' => $this->documentShape($this->documentRow((int) $document['id']), true)], 201);
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

        $this->sendInvoiceNotification($id, $request, $document->type . '_sent');

        $this->trackEvent($id, 'document.sent', $request, ['recipient' => $document->client_email]);

        return ['document' => $this->documentShape($this->documentRow($id), true)];
    }

    public function emailLogs(Request $request)
    {
        $perPage = $this->perPage($request);
        $page = max(1, (int) $request->input('page', 1));
        $query = DB::table('invoice_email_logs')
            ->leftJoin('invoice_documents', 'invoice_documents.id', '=', 'invoice_email_logs.document_id')
            ->leftJoin('invoice_clients', 'invoice_clients.id', '=', 'invoice_documents.client_id')
            ->select(
                'invoice_email_logs.*',
                'invoice_documents.number as document_number',
                'invoice_documents.type as document_type',
                'invoice_documents.status as document_status',
                'invoice_clients.name as client_name'
            )
            ->when($request->input('status'), fn ($query, $status) => $query->where('invoice_email_logs.status', $status))
            ->when($request->input('search'), function ($query, $search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('invoice_email_logs.recipient_email', 'like', "%{$search}%")
                        ->orWhere('invoice_email_logs.subject', 'like', "%{$search}%")
                        ->orWhere('invoice_documents.number', 'like', "%{$search}%")
                        ->orWhere('invoice_clients.name', 'like', "%{$search}%");
                });
            })
            ->when($request->input('type'), fn ($query, $type) => $query->where('invoice_documents.type', $type));
        $total = (clone $query)->count();
        $rows = $query
            ->orderByDesc('invoice_email_logs.created_at')
            ->forPage($page, $perPage)
            ->get();

        return [
            'logs' => $rows->map(fn ($row) => $this->emailLogShape($row, false)),
            'meta' => $this->paginationMeta($page, $perPage, $total),
        ];
    }

    public function clearEmailLogs(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'max:30'],
            'type' => ['nullable', Rule::in(['invoice', 'quote', 'receipt'])],
            'olderThanDays' => ['nullable', 'integer', 'min:1', 'max:3650'],
        ]);

        $query = DB::table('invoice_email_logs')
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->when($data['olderThanDays'] ?? null, fn ($query, $days) => $query->where('created_at', '<', now()->subDays((int) $days)));

        if (!empty($data['type'])) {
            $ids = DB::table('invoice_email_logs')
                ->join('invoice_documents', 'invoice_documents.id', '=', 'invoice_email_logs.document_id')
                ->where('invoice_documents.type', $data['type'])
                ->pluck('invoice_email_logs.id');
            $query->whereIn('id', $ids);
        }

        $deleted = $query->delete();

        return ['deleted' => $deleted];
    }

    public function emailLog(int $id)
    {
        $row = DB::table('invoice_email_logs')
            ->leftJoin('invoice_documents', 'invoice_documents.id', '=', 'invoice_email_logs.document_id')
            ->leftJoin('invoice_clients', 'invoice_clients.id', '=', 'invoice_documents.client_id')
            ->select(
                'invoice_email_logs.*',
                'invoice_documents.number as document_number',
                'invoice_documents.type as document_type',
                'invoice_documents.status as document_status',
                'invoice_clients.name as client_name'
            )
            ->where('invoice_email_logs.id', $id)
            ->first();

        if (!$row) {
            return response()->json(['message' => 'Email log not found.'], 404);
        }

        if (Schema::hasColumn('invoice_email_logs', 'body_html') && $row->document_id) {
            $document = $this->documentRow((int) $row->document_id);
            if ($document) {
                $bodyHtml = $this->invoiceEmailHtml($document, (string) $row->template_key, (string) $row->open_token);
                DB::table('invoice_email_logs')->where('id', $id)->update([
                    'body_html' => $bodyHtml,
                    'updated_at' => now(),
                ]);
                $row->body_html = $bodyHtml;
            }
        }

        return ['log' => $this->emailLogShape($row, true)];
    }

    public function trackEmailOpen(Request $request, string $token)
    {
        $log = DB::table('invoice_email_logs')->where('open_token', $token)->first();
        if ($log && !$log->opened_at) {
            DB::table('invoice_email_logs')->where('id', $log->id)->update([
                'opened_at' => now(),
                'updated_at' => now(),
            ]);

            $this->trackEvent((int) $log->document_id, 'email.opened', $request, [
                'emailLogId' => $log->id,
                'recipient' => $log->recipient_email,
            ], null, 'recipient');
        }

        $pixel = base64_decode('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==');

        return response($pixel, 200, [
            'Content-Type' => 'image/gif',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
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

            if (Schema::hasColumn('invoice_documents', 'service_overview')) {
                $payload['service_overview'] = $quote->service_overview ?? null;
            }

            if (Schema::hasColumn('invoice_documents', 'scope_of_service')) {
                $payload['scope_of_service'] = $quote->scope_of_service ?? null;
            }

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

        $this->sendInvoiceNotification($invoiceId, $request, 'invoice_created_from_quote');

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
                    'notes' => $this->cleanRichText($docData['notes'] ?? ''),
                    'terms' => $this->cleanRichText($docData['terms'] ?? ''),
                    'updated_at' => $this->dateTimeOrNull($docData['updated_at'] ?? $docData['updatedAt'] ?? null) ?: now(),
                ];

                $serviceOverview = $this->cleanRichText($docData['service_overview'] ?? $docData['serviceOverview'] ?? '');
                [$serviceOverview, $payload['notes']] = $this->normalizeServiceSelectorText($serviceOverview, $payload['notes']);

                if (Schema::hasColumn('invoice_documents', 'service_overview')) {
                    $payload['service_overview'] = $serviceOverview;
                }

                if (Schema::hasColumn('invoice_documents', 'scope_of_service')) {
                    $payload['scope_of_service'] = $this->cleanRichText($docData['scope_of_service'] ?? $docData['scopeOfService'] ?? '');
                }

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

    public function exportToJSON()
    {
        $documents = DB::table('invoice_documents')
            ->leftJoin('invoice_clients', 'invoice_clients.id', '=', 'invoice_documents.client_id')
            ->select(
                'invoice_documents.*',
                'invoice_clients.name as client_name',
                'invoice_clients.email as client_email',
                'invoice_clients.phone as client_phone',
                'invoice_clients.company_name as client_company',
                'invoice_clients.address as client_address'
            )
            ->orderBy('invoice_documents.id')
            ->get();

        $documentIds = $documents->pluck('id')->all();
        $export = [
            'source' => 'bakhtech-laravel',
            'version' => 1,
            'exported_at' => now()->toIso8601String(),
            'tables' => [
                'bk_quotes' => $documents->map(fn ($document) => $this->exportDocumentRow($document))->all(),
                'bk_line_items' => DB::table('invoice_document_items')
                    ->whereIn('document_id', $documentIds)
                    ->orderBy('document_id')
                    ->orderBy('sort_order')
                    ->get()
                    ->map(fn ($item) => $this->exportItemRow($item))
                    ->all(),
                'bk_payments' => DB::table('invoice_payments')
                    ->whereIn('document_id', $documentIds)
                    ->orderBy('document_id')
                    ->orderBy('id')
                    ->get()
                    ->map(fn ($payment) => $this->exportPaymentRow($payment))
                    ->all(),
                'bk_audit_logs' => DB::table('invoice_events')
                    ->whereIn('document_id', $documentIds)
                    ->orderBy('document_id')
                    ->orderBy('id')
                    ->get()
                    ->map(fn ($event) => $this->exportEventRow($event))
                    ->all(),
                'bk_email_logs' => DB::table('invoice_email_logs')
                    ->whereIn('document_id', $documentIds)
                    ->orderBy('document_id')
                    ->orderBy('id')
                    ->get()
                    ->map(fn ($log) => $this->exportEmailLogRow($log))
                    ->all(),
            ],
        ];

        $filename = 'bakhtech-invoice-export-' . now()->format('Y-m-d-His') . '.json';

        return response()->json($export, 200, [
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    private function exportDocumentRow(object $document): array
    {
        $row = [
            'id' => $document->id,
            'client_id' => $document->client_id,
            'quote_number' => $document->number,
            'number' => $document->number,
            'type' => $document->type,
            'title' => $document->title,
            'client_name' => $document->client_name,
            'client_email' => $document->client_email,
            'client_phone' => $document->client_phone,
            'client_company' => $document->client_company,
            'client_address' => $document->client_address,
            'issue_date' => $document->issue_date,
            'due_date' => $document->due_date,
            'valid_until' => $document->due_date,
            'status' => $document->status,
            'subtotal' => (float) $document->subtotal,
            'discount_total' => (float) $document->discount_total,
            'tax_total' => (float) $document->tax_total,
            'total_amount' => (float) $document->total,
            'total' => (float) $document->total,
            'amount_paid' => (float) $document->amount_paid,
            'balance_due' => (float) $document->balance_due,
            'currency' => $document->currency,
            'exchange_rate' => (float) $document->exchange_rate,
            'public_token' => $document->public_token,
            'payment_gateway' => $document->payment_gateway,
            'paymentEnabled' => (bool) $document->payment_enabled,
            'notes' => $document->notes,
            'terms' => $document->terms,
            'sent_at' => $document->sent_at,
            'viewed_at' => $document->viewed_at,
            'paid_at' => $document->paid_at,
            'created_at' => $document->created_at,
            'updated_at' => $document->updated_at,
        ];

        if (Schema::hasColumn('invoice_documents', 'legacy_client_token')) {
            $row['client_token'] = $document->legacy_client_token;
        }

        if (Schema::hasColumn('invoice_documents', 'service_overview')) {
            $row['service_overview'] = $document->service_overview;
        }

        if (Schema::hasColumn('invoice_documents', 'scope_of_service')) {
            $row['scope_of_service'] = $document->scope_of_service;
        }

        return $row;
    }

    private function exportItemRow(object $item): array
    {
        return [
            'id' => $item->id,
            'quote_id' => $item->document_id,
            'document_id' => $item->document_id,
            'name' => $item->name,
            'description' => $item->description,
            'quantity' => (float) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'unitPrice' => (float) $item->unit_price,
            'discount_type' => (float) $item->discount_rate > 0 ? 'percent' : 'fixed',
            'discount_value' => (float) $item->discount_rate,
            'tax_rate' => (float) $item->tax_rate,
            'line_total' => (float) $item->line_total,
            'sort_order' => (int) $item->sort_order,
            'created_at' => $item->created_at,
            'updated_at' => $item->updated_at,
        ];
    }

    private function exportPaymentRow(object $payment): array
    {
        return [
            'id' => $payment->id,
            'quote_id' => $payment->document_id,
            'document_id' => $payment->document_id,
            'gateway' => $payment->gateway,
            'reference' => $payment->reference,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'status' => $payment->status,
            'authorization_url' => $payment->authorization_url,
            'txn_payload' => $payment->gateway_response_json,
            'paid_at' => $payment->paid_at,
            'created_at' => $payment->created_at,
            'updated_at' => $payment->updated_at,
        ];
    }

    private function exportEventRow(object $event): array
    {
        $metadata = json_decode(($event->metadata_json ?? '') ?: '{}', true) ?: [];

        return [
            'id' => $event->id,
            'quote_id' => $event->document_id,
            'document_id' => $event->document_id,
            'action' => $event->event_type,
            'description' => $metadata['description'] ?? $event->event_type,
            'old_value' => $metadata['oldValue'] ?? null,
            'new_value' => $metadata['newValue'] ?? null,
            'user_id' => $event->actor_id,
            'ip_address' => $event->ip_address,
            'user_agent' => $event->user_agent,
            'created_at' => $event->created_at,
            'updated_at' => $event->updated_at,
        ];
    }

    private function exportEmailLogRow(object $log): array
    {
        return [
            'id' => $log->id,
            'quote_id' => $log->document_id,
            'document_id' => $log->document_id,
            'recipient_email' => $log->recipient_email,
            'subject' => $log->subject,
            'template_name' => $log->template_key,
            'status' => $log->status,
            'sent_at' => $log->sent_at,
            'opened_at' => $log->opened_at,
            'clicked_at' => $log->clicked_at,
            'created_at' => $log->created_at,
            'updated_at' => $log->updated_at,
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
        $account = $document['paymentAccount'] ?? [];
        $currency = $this->currencySymbol($document['currency']);
        $formatMoney = fn ($amount) => e($currency . $this->formatEmailAmount((float) $amount));
        $items = '';
        $logoSrc = $this->pdfLogoSrc();
        $logo = $logoSrc
            ? '<img class="logo" src="' . e($logoSrc) . '" alt="' . e($brand['businessName']) . '">'
            : '';

        foreach ($document['items'] as $item) {
            $items .= '<tr>'
                . '<td><strong>' . e($item['name']) . '</strong>' . ($item['description'] ? '<div class="muted rich">' . $item['description'] . '</div>' : '') . '</td>'
                . '<td class="right">' . e((string) $item['quantity']) . '</td>'
                . '<td class="right">' . $formatMoney($item['unitPrice']) . '</td>'
                . '<td class="right"><strong>' . $formatMoney($item['lineTotal'] ?? 0) . '</strong></td>'
                . '</tr>';
        }

        $accountRows = '';
        $accountMap = [
            'Account Name' => $account['accountName'] ?? '',
            'Account Number' => $account['accountNumber'] ?? '',
            'Bank' => $account['bankName'] ?? '',
            'Account Type' => $account['accountType'] ?? '',
            'Wire Routing' => $account['wireRouting'] ?? '',
            'ACH Routing' => $account['achRouting'] ?? '',
            'Instructions' => $account['instructions'] ?? '',
        ];

        foreach ($accountMap as $label => $value) {
            if (trim((string) $value) === '') {
                continue;
            }
            $accountRows .= '<div><span>' . e($label) . '</span><strong>' . nl2br(e((string) $value)) . '</strong></div>';
        }

        if ($accountRows === '') {
            $accountRows = '<p class="muted">Manual/offline payment is available. Contact ' . e($brand['businessName']) . ' for bank transfer confirmation.</p>';
        }

        [$serviceOverview, $documentNotes] = $this->normalizeServiceSelectorText((string) $document['serviceOverview'], (string) $document['notes']);
        $quoteService = $document['type'] === 'quote' && $serviceOverview
            ? '<section><h3>Service Overview</h3><div class="rich">' . $serviceOverview . '</div></section>'
            : '';
        $quoteScope = $document['type'] === 'quote' && $document['scopeOfService']
            ? '<section><h3>Scope of Service</h3><div class="rich">' . $document['scopeOfService'] . '</div></section>'
            : '';
        $notes = $documentNotes ? '<section><h3>Notes</h3><div class="rich">' . $documentNotes . '</div></section>' : '';
        $termsValue = trim(strip_tags((string) $document['terms'])) === 'Pricing is locked for this document. Future pricing changes will not affect this quote or invoice.'
            ? ''
            : $document['terms'];
        $terms = $termsValue ? '<section><h3>Terms</h3><div class="rich">' . $termsValue . '</div></section>' : '';

        return '<!doctype html><html><head><meta charset="utf-8"><style>
            @page { margin: 28px; }
            * { box-sizing: border-box; }
            body { font-family: DejaVu Sans, Arial, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.55; background: #f8fafc; }
            h1,h2,h3,p { margin: 0; }
            .sheet { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; overflow: hidden; }
            .accent { height: 8px; background: ' . e($brand['primaryColor']) . '; }
            .top { padding: 28px 30px 24px; border-bottom: 1px solid #e2e8f0; }
            .top-table { width: 100%; border-collapse: collapse; }
            .top-table td { vertical-align: top; }
            .logo { width: 150px; max-height: 70px; object-fit: contain; }
            .brand-name { margin-top: 10px; font-size: 16px; font-weight: 900; letter-spacing: .03em; }
            .brand-meta { margin-top: 6px; color: #64748b; font-size: 10.5px; line-height: 1.7; }
            .title-box { text-align: right; }
            .title-box span { color: ' . e($brand['primaryColor']) . '; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .18em; }
            .title { color: #020617; font-size: 34px; line-height: 1; margin-top: 8px; text-transform: uppercase; }
            .number { margin-top: 8px; color: #475569; font-weight: 800; }
            .status { display: inline-block; margin-top: 12px; padding: 6px 11px; border-radius: 999px; background: #eff6ff; color: #1d4ed8; font-size: 10px; font-weight: 900; text-transform: uppercase; }
            .content { padding: 24px 30px 28px; }
            .grid { width: 100%; border-collapse: separate; border-spacing: 0 0; margin-bottom: 22px; }
            .grid td { width: 50%; vertical-align: top; }
            .grid td:first-child { padding-right: 10px; }
            .grid td:last-child { padding-left: 10px; }
            .box { border: 1px solid #e2e8f0; padding: 16px; border-radius: 14px; background: #f8fafc; min-height: 118px; }
            .label { color: #64748b; font-size: 9.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px; }
            .muted { color: #64748b; }
            table.items { width: 100%; border-collapse: collapse; margin-top: 16px; }
            .items th { background: #0f172a; color: #fff; font-size: 9.5px; text-transform: uppercase; text-align: left; padding: 11px 10px; letter-spacing: .08em; }
            .items th:first-child { border-radius: 10px 0 0 10px; }
            .items th:last-child { border-radius: 0 10px 10px 0; }
            .items td { border-bottom: 1px solid #e2e8f0; padding: 13px 10px; vertical-align: top; }
            .right { text-align: right; }
            section { margin-top: 22px; }
            section h3 { color: #0f172a; font-size: 12px; text-transform: uppercase; margin-bottom: 9px; letter-spacing: .12em; }
            .rich ul, .rich ol { margin: 6px 0 8px 18px; padding: 0; }
            .below { width: 100%; border-collapse: collapse; margin-top: 22px; }
            .below td { vertical-align: top; }
            .payment { width: 56%; padding-right: 18px; }
            .payment-card { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 14px; padding: 15px; }
            .payment-card div { margin-top: 7px; }
            .payment-card span { display: block; color: #64748b; font-size: 9.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
            .payment-card strong { display: block; color: #0f172a; font-size: 11px; margin-top: 1px; }
            .totals { width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; }
            .totals td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
            .totals .final td { border-bottom: 0; background: #0f172a; color: #fff; font-size: 16px; font-weight: 900; }
            .footer { padding: 14px 30px 20px; color: #64748b; font-size: 10px; border-top: 1px solid #e2e8f0; }
        </style></head><body>
            <div class="sheet">
            <div class="accent"></div>
            <div class="top">
                <table class="top-table"><tr>
                    <td>
                        ' . $logo . '
                        <div class="brand-name">' . e($brand['businessName']) . '</div>
                        <div class="brand-meta">' . e($brand['email']) . '<br>' . e($brand['phone']) . '<br>' . nl2br(e($brand['address'])) . '</div>
                    </td>
                    <td class="title-box">
                        <span>' . e($document['type']) . '</span>
                        <h1 class="title">' . e($document['type'] === 'quote' ? 'Quote' : ($document['type'] === 'receipt' ? 'Receipt' : 'Invoice')) . '</h1>
                        <div class="number">#' . e($document['number']) . '</div>
                        <span class="status">' . e($document['status']) . '</span>
                    </td>
                </tr></table>
            </div>
            <div class="content">
            <table class="grid"><tr>
                <td><div class="box"><div class="label">Prepared For</div><strong>' . e($client['name']) . '</strong><br><span class="muted">' . e($client['companyName']) . '<br>' . e($client['email']) . '<br>' . e($client['phone']) . '<br>' . nl2br(e($client['address'])) . '</span></div></td>
                <td><div class="box"><div class="label">Document Details</div><strong>' . e(ucfirst($document['type'])) . ' #' . e($document['number']) . '</strong><br><span class="muted">Issued: ' . e((string) $document['issueDate']) . '<br>Due: ' . e((string) $document['dueDate']) . '<br>Currency: ' . e((string) $document['currency']) . '</span></div></td>
            </tr></table>
            ' . $quoteService . $quoteScope . '
            <section><h3>Line Items</h3><table class="items"><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Total</th></tr></thead><tbody>' . $items . '</tbody></table></section>
            <table class="below"><tr>
                <td class="payment"><div class="payment-card"><h3>Payment Details</h3>' . $accountRows . '</div></td>
                <td><table class="totals">
                    <tr><td>Subtotal</td><td class="right">' . $formatMoney($document['subtotal']) . '</td></tr>
                    <tr><td>Discount</td><td class="right">' . $formatMoney($document['discountTotal']) . '</td></tr>
                    <tr><td>Tax</td><td class="right">' . $formatMoney($document['taxTotal']) . '</td></tr>
                    ' . ((float) $document['amountPaid'] > 0 ? '<tr><td>Paid</td><td class="right">' . $formatMoney($document['amountPaid']) . '</td></tr>' : '') . '
                    <tr class="final"><td>' . ($document['type'] === 'quote' ? 'Total' : 'Balance Due') . '</td><td class="right">' . $formatMoney($document['type'] === 'quote' ? $document['total'] : $document['balanceDue']) . '</td></tr>
                </table></td>
            </tr></table>
            ' . $notes . $terms . '
            </div>
            <div class="footer">Generated by ' . e($brand['businessName']) . '. Thank you for choosing us.</div>
            </div>
        </body></html>';
    }

    private function money(mixed $value): float
    {
        return round((float) preg_replace('/[^\d.\-]/', '', (string) $value), 2);
    }

    private function normalizedDocumentText(object $row): array
    {
        [$serviceOverview, $notes] = $this->normalizeServiceSelectorText(
            $this->cleanRichText(($row->service_overview ?? '') ?: ''),
            $this->cleanRichText($row->notes ?: '')
        );

        return [
            'serviceOverview' => $serviceOverview,
            'notes' => $notes,
        ];
    }

    private function normalizeServiceSelectorText(string $serviceOverview, string $notes): array
    {
        if (!$this->isServiceSelectorSummary($serviceOverview)) {
            return [$serviceOverview, $notes];
        }

        if (!str_contains(strip_tags($notes), strip_tags($serviceOverview))) {
            $notes = trim($serviceOverview . ($notes !== '' ? "\n\n" . $notes : ''));
        }

        return ['', $notes];
    }

    private function isServiceSelectorSummary(string $value): bool
    {
        $plain = trim(preg_replace('/\s+/', ' ', strip_tags(html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8'))) ?: '');

        return str_starts_with($plain, 'Generated via Service Selector.');
    }

    private function pdfLogoSrc(): string
    {
        $path = public_path('bakhtech-logo-light.jpg');
        if (!is_file($path)) {
            return '';
        }

        $data = file_get_contents($path);
        if ($data === false) {
            return '';
        }

        return 'data:image/jpeg;base64,' . base64_encode($data);
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
            'serviceOverview' => ['nullable', 'string'],
            'scopeOfService' => ['nullable', 'string'],
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

            if (Schema::hasColumn('invoice_documents', 'service_overview')) {
                [$serviceOverview, $payload['notes']] = $this->normalizeServiceSelectorText(
                    $this->cleanRichText($data['serviceOverview'] ?? ''),
                    $payload['notes']
                );
                $payload['service_overview'] = $serviceOverview;
            }

            if (Schema::hasColumn('invoice_documents', 'scope_of_service')) {
                $payload['scope_of_service'] = $this->cleanRichText($data['scopeOfService'] ?? '');
            }

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
        $documentText = $this->normalizedDocumentText($row);

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
            'serviceOverview' => $documentText['serviceOverview'],
            'scopeOfService' => $this->cleanRichText(($row->scope_of_service ?? '') ?: ''),
            'notes' => $documentText['notes'],
            'terms' => $this->cleanRichText($row->terms ?: ''),
            'branding' => $this->branding(json_decode($row->branding_json ?: '{}', true) ?: []),
            'paymentAccount' => $this->paymentAccount((string) $row->currency),
            'pricing' => [
                'categoryId' => isset($row->pricing_category_id) ? $row->pricing_category_id : null,
                'planId' => isset($row->pricing_plan_id) ? $row->pricing_plan_id : null,
                'versionId' => isset($row->pricing_version_id) ? $row->pricing_version_id : null,
                'snapshot' => json_decode(($row->pricing_snapshot_json ?? '') ?: '{}', true) ?: null,
                'selectedFeatures' => json_decode(($row->selected_features_snapshot_json ?? '') ?: '[]', true) ?: [],
            ],
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

    private function perPage(Request $request): int
    {
        return min(100, max(10, (int) $request->input('perPage', 25)));
    }

    private function paginationMeta(int $page, int $perPage, int $total): array
    {
        return [
            'page' => $page,
            'perPage' => $perPage,
            'total' => $total,
            'lastPage' => max(1, (int) ceil($total / $perPage)),
        ];
    }

    private function emailLogShape(object $row, bool $includeBody): array
    {
        return [
            'id' => $row->id,
            'documentId' => $row->document_id,
            'documentNumber' => $row->document_number ?? '',
            'documentType' => $row->document_type ?? '',
            'documentStatus' => $row->document_status ?? '',
            'clientName' => $row->client_name ?? '',
            'recipientEmail' => $row->recipient_email,
            'subject' => $row->subject,
            'templateKey' => $row->template_key,
            'status' => $row->status,
            'bodyHtml' => $includeBody ? (string) ($row->body_html ?? '') : '',
            'sentAt' => (string) ($row->sent_at ?? ''),
            'openedAt' => (string) ($row->opened_at ?? ''),
            'clickedAt' => (string) ($row->clicked_at ?? ''),
            'errorMessage' => (string) ($row->error_message ?? ''),
            'createdAt' => (string) $row->created_at,
            'updatedAt' => (string) $row->updated_at,
        ];
    }

    private function sendInvoiceNotification(int $documentId, Request $request, string $templateKey): void
    {
        if (!Schema::hasTable('invoice_email_logs')) {
            return;
        }

        $document = $this->documentRow($documentId);
        if (!$document || !$document->client_email) {
            return;
        }

        $openToken = (string) Str::uuid();
        $clickToken = (string) Str::uuid();
        $subject = $this->invoiceEmailSubject($document, $templateKey);
        $bodyHtml = $this->invoiceEmailHtml($document, $templateKey, $openToken);
        $payload = [
            'document_id' => $documentId,
            'recipient_email' => $document->client_email,
            'subject' => $subject,
            'template_key' => $templateKey,
            'status' => 'queued',
            'open_token' => $openToken,
            'click_token' => $clickToken,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (Schema::hasColumn('invoice_email_logs', 'body_html')) {
            $payload['body_html'] = $bodyHtml;
        }

        $logId = (int) DB::table('invoice_email_logs')->insertGetId($payload);

        try {
            Mail::html($bodyHtml, function ($message) use ($document, $subject) {
                $message->to($document->client_email, $document->client_name ?: null)
                    ->subject($subject);
            });

            DB::table('invoice_email_logs')->where('id', $logId)->update([
                'status' => 'sent',
                'sent_at' => now(),
                'updated_at' => now(),
            ]);

            $this->trackEvent($documentId, 'email.sent', $request, [
                'emailLogId' => $logId,
                'recipient' => $document->client_email,
                'templateKey' => $templateKey,
            ], null, 'system');
        } catch (\Throwable $exception) {
            $update = [
                'status' => 'failed',
                'updated_at' => now(),
            ];

            if (Schema::hasColumn('invoice_email_logs', 'error_message')) {
                $update['error_message'] = $exception->getMessage();
            }

            DB::table('invoice_email_logs')->where('id', $logId)->update($update);
        }
    }

    private function invoiceEmailSubject(object $document, string $templateKey): string
    {
        $label = ucfirst((string) $document->type);

        return match ($templateKey) {
            'invoice_created_from_quote' => 'Your invoice is ready: ' . $document->number,
            default => $label . ' ' . $document->number . ' from Bakhtech Solutions',
        };
    }

    private function invoiceEmailHtml(object $document, string $templateKey, string $openToken): string
    {
        $branding = $this->branding(json_decode($document->branding_json ?: '{}', true) ?: []);
        $label = ucfirst((string) $document->type);
        $clientName = htmlspecialchars((string) ($document->client_name ?: 'there'), ENT_QUOTES, 'UTF-8');
        $businessName = htmlspecialchars((string) $branding['businessName'], ENT_QUOTES, 'UTF-8');
        $logoUrl = htmlspecialchars($this->absoluteUrl((string) ($branding['logoUrl'] ?: '/bakhtech-logo-light.png')), ENT_QUOTES, 'UTF-8');
        $number = htmlspecialchars((string) $document->number, ENT_QUOTES, 'UTF-8');
        $currencySymbol = htmlspecialchars($this->currencySymbol((string) $document->currency), ENT_QUOTES, 'UTF-8');
        $total = $this->formatEmailAmount((float) $document->total);
        $balance = $this->formatEmailAmount((float) $document->balance_due);
        $publicUrl = htmlspecialchars($this->absoluteUrl('/invoice/' . $document->public_token), ENT_QUOTES, 'UTF-8');
        $pdfUrl = htmlspecialchars($this->absoluteUrl('/api/invoices/' . $document->public_token . '/pdf'), ENT_QUOTES, 'UTF-8');
        $openUrl = htmlspecialchars($this->absoluteUrl('/api/invoices/email/open/' . $openToken), ENT_QUOTES, 'UTF-8');
        $issueDate = htmlspecialchars((string) ($document->issue_date ?? ''), ENT_QUOTES, 'UTF-8');
        $dueDate = htmlspecialchars((string) ($document->due_date ?? ''), ENT_QUOTES, 'UTF-8');
        $headline = match (true) {
            $templateKey === 'invoice_created_from_quote' => 'Invoice ready',
            $document->type === 'quote' => 'Quote ready',
            $document->type === 'receipt' => 'Receipt issued',
            default => 'Invoice ready',
        };
        $message = match (true) {
            $templateKey === 'invoice_created_from_quote' => 'Your approved quote has been converted into an invoice. Please review the invoice details below.',
            $document->type === 'quote' => 'Your quote is available for review. Please confirm the details when you are ready to proceed.',
            $document->type === 'receipt' => 'Your receipt has been issued. You can view the payment record or download a copy below.',
            default => 'Your invoice is available for review. Please check the details below and proceed with payment when convenient.',
        };
        $primaryAction = match ($document->type) {
            'quote' => 'Review quote',
            'receipt' => 'View receipt',
            default => 'Open invoice',
        };
        $priceLabel = match ($document->type) {
            'quote' => 'Quoted amount',
            'receipt' => 'Amount recorded',
            default => 'Amount due',
        };
        $priceValue = $document->type === 'invoice' ? "{$currencySymbol}{$balance}" : "{$currencySymbol}{$total}";
        $documentTitle = "{$label} {$number}";

        return <<<HTML
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{$label} {$number}</title>
</head>
<body style="margin:0;background:#f4f7fb;font-family:Manrope,Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;">{$headline}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #dbe4f0;box-shadow:0 18px 46px rgba(15,23,42,.12);">
          <tr>
            <td style="padding:28px 30px 0;">
              <img src="{$logoUrl}" width="142" alt="{$businessName}" style="display:block;max-width:142px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#ef4444;font-weight:900;">{$documentTitle}</p>
              <h1 style="margin:0 0 22px;font-size:26px;line-height:1.16;color:#0f172a;font-weight:900;">{$headline}</h1>
              <p style="margin:0 0 10px;font-size:16px;line-height:1.7;color:#0f172a;">Hello {$clientName},</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#475569;">{$message}</p>
              <div style="margin:0 0 24px;padding:18px;border:1px solid #e2e8f0;border-radius:18px;background:#f8fafc;">
                <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.12em;font-weight:900;">{$priceLabel}</div>
                <div style="font-size:30px;font-weight:900;margin-top:6px;color:#0f172a;">{$priceValue}</div>
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 26px;border-collapse:collapse;border-top:1px solid #e2e8f0;">
                <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Issue date</td><td align="right" style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:900;color:#0f172a;">{$issueDate}</td></tr>
                <tr><td style="padding:12px 0;color:#64748b;border-bottom:1px solid #e2e8f0;">Due date</td><td align="right" style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-weight:900;color:#0f172a;">{$dueDate}</td></tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td><a href="{$publicUrl}" style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;font-weight:900;border-radius:14px;padding:15px 22px;">{$primaryAction}</a></td>
                  <td width="10"></td>
                  <td><a href="{$pdfUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:900;border-radius:14px;padding:15px 22px;">Download PDF</a></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 30px;background:#f8fafc;color:#64748b;font-size:12px;line-height:1.65;">
              Sent by {$businessName}. If the buttons do not work, open this secure link: <a href="{$publicUrl}" style="color:#ef4444;font-weight:800;">{$publicUrl}</a>
              <img src="{$openUrl}" width="1" height="1" alt="" style="display:block;border:0;outline:0;width:1px;height:1px;">
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
    }

    private function absoluteUrl(string $path): string
    {
        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return rtrim((string) config('app.url'), '/') . '/' . ltrim($path, '/');
    }

    private function currencySymbol(string $currency): string
    {
        return match (strtoupper($currency)) {
            'NGN' => '₦',
            'USD' => '$',
            'GBP' => '£',
            'EUR' => '€',
            'JPY', 'CNY' => '¥',
            'GHS' => '₵',
            'ZAR' => 'R',
            default => strtoupper($currency) . ' ',
        };
    }

    private function formatEmailAmount(float $amount): string
    {
        return fmod($amount, 1.0) === 0.0
            ? number_format($amount, 0)
            : rtrim(rtrim(number_format($amount, 2), '0'), '.');
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

    private function paymentAccount(string $currency): array
    {
        $settings = $this->siteSettings();
        $currency = strtoupper($currency);
        $account = [];

        $currencyAccounts = json_decode((string) ($settings['bank_currency_accounts'] ?? '[]'), true);
        if (is_array($currencyAccounts)) {
            foreach ($currencyAccounts as $candidate) {
                if (!is_array($candidate)) {
                    continue;
                }

                if (strtoupper((string) ($candidate['currency'] ?? '')) === $currency) {
                    $account = $candidate;
                    break;
                }
            }
        }

        return [
            'currency' => $account['currency'] ?? $currency,
            'accountName' => $account['account_name'] ?? $settings['bank_account_name'] ?? '',
            'accountNumber' => $account['account_number'] ?? $settings['bank_account_number'] ?? '',
            'bankName' => $account['bank_name'] ?? $settings['bank_bank_name'] ?? '',
            'bankAddress' => $account['bank_address'] ?? '',
            'wireRouting' => $account['wire_routing'] ?? '',
            'achRouting' => $account['ach_routing'] ?? '',
            'accountType' => $account['account_type'] ?? '',
            'instructions' => $account['instructions'] ?? $settings['bank_instructions'] ?? '',
        ];
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
