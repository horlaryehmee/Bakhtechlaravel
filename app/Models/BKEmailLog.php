<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BKEmailLog extends Model
{
    protected $table = 'bk_email_logs';

    protected $fillable = [
        'quote_id', 'recipient_email', 'subject', 'template_name', 
        'body_html', 'status', 'sent_at', 'opened_at', 'error_message'
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'opened_at' => 'datetime',
    ];

    public function quote(): BelongsTo
    {
        return $this->belongsTo(BKQuote::class, 'quote_id');
    }
}
