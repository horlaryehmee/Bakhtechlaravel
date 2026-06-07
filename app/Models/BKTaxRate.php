<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BKTaxRate extends Model
{
    protected $table = 'bk_tax_rates';

    protected $fillable = [
        'name', 'rate', 'description', 'is_default', 'is_active'
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];
}
