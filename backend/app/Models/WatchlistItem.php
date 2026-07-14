<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string $symbol
 * @property string|null $name
 * @property string|null $type
 * @property string|null $exchange
 */
class WatchlistItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'symbol',
        'name',
        'type',
        'exchange',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
