<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Attributes\Fillable;

#[Fillable(['user_id', 'year', 'month', 'monthly_income', 'monthly_expenses'])]
class FinancialRecord extends Model
{
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
