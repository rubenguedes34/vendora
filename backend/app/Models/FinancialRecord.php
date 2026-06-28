<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinancialRecord extends Model
{
    protected $fillable = [
        'user_id',
        'year',
        'month',
        'monthly_income',
        'monthly_expenses',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
