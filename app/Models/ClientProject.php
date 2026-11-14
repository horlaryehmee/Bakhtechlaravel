<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientProject extends Model
{
    protected $guarded = ['id'];
    public function client(): BelongsTo { return $this->belongsTo(User::class, 'client_id'); }
}
