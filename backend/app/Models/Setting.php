<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'json'];

    public static function get(string $key, mixed $default = null): mixed
    {
        $all = Cache::rememberForever('settings', fn () => static::pluck('value', 'key')->all());

        return array_key_exists($key, $all) ? $all[$key] : $default;
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget('settings');
    }
}
