<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BKPayment extends Model
{
    protected $table = 'bk_payments';

    protected $fillable = [
        'quote_id', 'type', 'gateway', 'method', 'amount', 'currency', 
        'reference', 'notes', 'status', 'txn_payload', 'user_id', 'paid_at'
    ];

    protected $casts = [
        'txn_payload' => 'array',
        'paid_at' => 'datetime',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(BKQuote::class, 'quote_id');
    }
}
