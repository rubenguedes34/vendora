<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
