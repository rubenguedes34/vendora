<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property string $name
 * @property string $type
 * @property string $initial_amount
 * @property string $current_amount
 * @property \Carbon\Carbon $purchase_date
 */
class Investment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'initial_amount',
        'current_amount',
        'purchase_date',
    ];

    /** @var array<array-key, mixed> */
    protected $casts = [
        'initial_amount' => 'decimal:2',
        'current_amount' => 'decimal:2',
        'purchase_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
