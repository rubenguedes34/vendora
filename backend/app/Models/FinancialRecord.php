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
        'savings_goal',
        'savings_goal_type',
    ];

    protected $appends = ['savings'];

    public function getSavingsAttribute(): float
    {
        return (float) $this->monthly_income - (float) $this->monthly_expenses;
    }

    public function getSavingsGoalAmountAttribute(): float
    {
        if ($this->savings_goal_type === 'percentage') {
            return ((float) $this->monthly_income * (float) $this->savings_goal) / 100;
        }

        return (float) $this->savings_goal;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
