<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BKLineItem extends Model
{
    protected $table = 'bk_line_items';

    protected $fillable = [
        'quote_id', 'sort_order', 'item_type', 'sku', 'name', 'description',
        'quantity', 'unit_price', 'tax_rate', 'tax_amount', 'discount_type',
        'discount_value', 'discount_amount', 'line_total'
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(BKQuote::class, 'quote_id');
    }
}
