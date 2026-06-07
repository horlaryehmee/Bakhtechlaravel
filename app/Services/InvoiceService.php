<?php

namespace App\Services;

use App\Models\BKQuote;
use App\Models\BKLineItem;
use App\Models\BKPayment;
use App\Models\BKSetting;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public function createQuote(array $data): BKQuote
    {
        return DB::transaction(function () use ($data) {
            $settings = $this->getSettings();
            
            $type = $data['type'] ?? 'quote';
            $prefix = $type === 'invoice' ? ($settings['invoice_prefix'] ?? 'INV-') : ($settings['quote_prefix'] ?? 'QT-');
            $startingNumber = (int) ($settings['starting_number'] ?? 1000);
            
            $lastNumber = BKQuote::where('type', $type)
                ->where('quote_number', 'like', $prefix . '%')
                ->max('quote_number');
            
            if ($lastNumber) {
                $lastNum = (int) str_replace($prefix, '', $lastNumber);
                $nextNumber = $lastNum + 1;
            } else {
                $nextNumber = $startingNumber;
            }
            
            $quoteNumber = $prefix . $nextNumber;

            $quote = BKQuote::create([
                'quote_number' => $quoteNumber,
                'type' => $type,
                'client_name' => $data['client_name'] ?? null,
                'client_email' => $data['client_email'] ?? null,
                'client_phone' => $data['client_phone'] ?? null,
                'client_address' => $data['client_address'] ?? null,
                'client_company' => $data['client_company'] ?? null,
                'issue_date' => $data['issue_date'] ?? now()->toDateString(),
                'due_date' => $data['due_date'] ?? null,
                'valid_until' => $data['valid_until'] ?? null,
                'status' => $data['status'] ?? 'draft',
                'currency' => $data['currency'] ?? 'NGN',
                'currency_symbol' => $data['currency_symbol'] ?? '',
                'exchange_rate' => $data['exchange_rate'] ?? 1,
                'notes' => $data['notes'] ?? null,
                'terms' => $data['terms'] ?? null,
                'footer' => $data['footer'] ?? null,
                'service_overview' => $data['service_overview'] ?? null,
                'scope_of_service' => $data['scope_of_service'] ?? null,
                'created_by' => auth()->guard('admin')->id() ?? null,
            ]);

            if (!empty($data['line_items'])) {
                $this->updateLineItems($quote, $data['line_items']);
            }

            return $quote->load('lineItems');
        });
    }

    public function updateQuote(BKQuote $quote, array $data): BKQuote
    {
        return DB::transaction(function () use ($quote, $data) {
            $quote->update(array_filter($data, function ($key) {
                return in_array($key, [
                    'client_name', 'client_email', 'client_phone', 'client_address', 'client_company',
                    'issue_date', 'due_date', 'valid_until', 'status', 'currency', 'currency_symbol',
                    'exchange_rate', 'notes', 'terms', 'footer', 'service_overview', 'scope_of_service'
                ]);
            }, ARRAY_FILTER_USE_KEY));

            if (isset($data['line_items'])) {
                $this->updateLineItems($quote, $data['line_items']);
            }

            return $quote->load('lineItems');
        });
    }

    protected function updateLineItems(BKQuote $quote, array $lineItems): void
    {
        $quote->lineItems()->delete();
        
        $subtotal = 0;
        $taxTotal = 0;
        $discountTotal = 0;

        foreach ($lineItems as $index => $item) {
            $lineTotal = ($item['quantity'] * $item['unit_price']);
            
            $discountAmount = 0;
            if ($item['discount_type'] === 'percent') {
                $discountAmount = ($item['discount_value'] / 100) * $lineTotal;
            } else {
                $discountAmount = $item['discount_value'] ?? 0;
            }

            $taxAmount = ($item['tax_rate'] / 100) * ($lineTotal - $discountAmount);

            $lineTotal = $lineTotal - $discountAmount + $taxAmount;

            $lineItem = BKLineItem::create([
                'quote_id' => $quote->id,
                'sort_order' => $index,
                'item_type' => $item['item_type'] ?? 'service',
                'sku' => $item['sku'] ?? null,
                'name' => $item['name'],
                'description' => $item['description'] ?? null,
                'quantity' => $item['quantity'] ?? 1,
                'unit_price' => $item['unit_price'] ?? 0,
                'tax_rate' => $item['tax_rate'] ?? 0,
                'tax_amount' => $taxAmount,
                'discount_type' => $item['discount_type'] ?? 'fixed',
                'discount_value' => $item['discount_value'] ?? 0,
                'discount_amount' => $discountAmount,
                'line_total' => $lineTotal,
            ]);

            $subtotal += ($item['quantity'] * $item['unit_price']);
            $taxTotal += $taxAmount;
            $discountTotal += $discountAmount;
        }

        $total = $subtotal - $discountTotal + $taxTotal;

        $quote->update([
            'subtotal' => $subtotal,
            'tax_total' => $taxTotal,
            'discount_total' => $discountTotal,
            'total_amount' => $total,
            'balance_due' => $total - $quote->amount_paid,
        ]);
    }

    public function getSettings(): array
    {
        $settings = BKSetting::all()->pluck('setting_value', 'setting_key')->toArray();
        return $settings;
    }

    public function convertQuoteToInvoice(BKQuote $quote): BKQuote
    {
        return DB::transaction(function () use ($quote) {
            $invoice = $this->createQuote([
                'type' => 'invoice',
                'client_name' => $quote->client_name,
                'client_email' => $quote->client_email,
                'client_phone' => $quote->client_phone,
                'client_address' => $quote->client_address,
                'client_company' => $quote->client_company,
                'issue_date' => now()->toDateString(),
                'status' => 'draft',
                'currency' => $quote->currency,
                'currency_symbol' => $quote->currency_symbol,
                'line_items' => $quote->lineItems->toArray(),
            ]);

            $quote->update(['converted_to_id' => $invoice->id]);
            $invoice->update(['converted_from_id' => $quote->id]);

            return $invoice;
        });
    }

    public function recordPayment(BKQuote $quote, array $data): BKPayment
    {
        return DB::transaction(function () use ($quote, $data) {
            $payment = BKPayment::create([
                'quote_id' => $quote->id,
                'type' => $data['type'] ?? 'payment',
                'gateway' => $data['gateway'] ?? null,
                'method' => $data['method'] ?? null,
                'amount' => $data['amount'],
                'currency' => $data['currency'] ?? $quote->currency,
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => $data['status'] ?? 'pending',
                'user_id' => auth()->guard('admin')->id() ?? null,
            ]);

            if ($payment->status === 'completed') {
                $newAmountPaid = $quote->amount_paid + $payment->amount;
                $newStatus = $newAmountPaid >= $quote->total_amount ? 'paid' : 'partial';

                $quote->update([
                    'amount_paid' => $newAmountPaid,
                    'status' => $newStatus,
                    'paid_at' => $newStatus === 'paid' ? now() : $quote->paid_at,
                ]);
            }

            return $payment;
        });
    }
}
