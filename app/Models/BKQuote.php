<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

class BKQuote extends Model
{
    protected $table = 'bk_quotes';

    protected $fillable = [
        'quote_number', 'type', 'client_id', 'client_name', 'client_email', 
        'client_phone', 'client_address', 'client_company', 'issue_date', 
        'due_date', 'valid_until', 'status', 'subtotal', 'tax_total', 
        'discount_total', 'overall_discount_type', 'overall_discount_value', 
        'total_amount', 'amount_paid', 'currency', 'currency_symbol', 
        'exchange_rate', 'service_overview', 'scope_of_service', 'notes', 
        'terms', 'footer', 'payment_link_url', 'public_token', 'client_token', 
        'converted_from_id', 'converted_to_id', 'created_by', 'sent_at', 
        'viewed_at', 'paid_at'
    ];

    protected $casts = [
        'issue_date' => 'date',
        'due_date' => 'date',
        'valid_until' => 'date',
        'sent_at' => 'datetime',
        'viewed_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public static function boot()
    {
        parent::boot();

        static::creating(function ($quote) {
            if (!$quote->public_token) {
                $quote->public_token = Str::random(64);
            }
            if (!$quote->client_token) {
                $quote->client_token = Str::random(64);
            }
        });
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(BKLineItem::class, 'quote_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(BKPayment::class, 'quote_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(BKAuditLog::class, 'quote_id');
    }

    public function emailLogs(): HasMany
    {
        return $this->hasMany(BKEmailLog::class, 'quote_id');
    }

    public function convertedFrom(): HasOne
    {
        return $this->hasOne(self::class, 'id', 'converted_from_id');
    }

    public function convertedTo(): HasOne
    {
        return $this->hasOne(self::class, 'id', 'converted_to_id');
    }
}
