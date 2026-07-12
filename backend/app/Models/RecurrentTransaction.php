<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string $description
 * @property float $amount
 * @property string $type
 * @property int $category_id
 * @property int $day_of_month
 */
class RecurrentTransaction extends Model
{
    protected $fillable = [
        'user_id',
        'description',
        'amount',
        'type',
        'category_id',
        'day_of_month',
    ];

    protected $casts = [
        'amount' => 'float',
        'day_of_month' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
