<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BKSetting extends Model
{
    protected $table = 'bk_settings';

    protected $fillable = [
        'setting_key', 'setting_value', 'autoload'
    ];

    protected $casts = [
        'autoload' => 'boolean',
    ];

    public function getSettingValueAttribute($value)
    {
        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }
        return $value;
    }

    public function setSettingValueAttribute($value)
    {
        if (is_array($value) || is_object($value)) {
            $this->attributes['setting_value'] = json_encode($value);
        } else {
            $this->attributes['setting_value'] = $value;
        }
    }
}
