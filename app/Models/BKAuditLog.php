<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BKAuditLog extends Model
{
    protected $table = 'bk_audit_logs';

    protected $fillable = [
        'quote_id', 'user_id', 'action', 'description', 'old_value', 
        'new_value', 'ip_address', 'user_agent'
    ];

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(BKQuote::class, 'quote_id');
    }
}
