<?php

namespace App\Models;

use App\Services\FinancialCacheService;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property int $year
 * @property int $month
 * @property float $monthly_income
 * @property float $monthly_expenses
 * @property float|null $savings_goal
 * @property string|null $savings_goal_type
 * @property float $savings
 * @property-read User $user
 */
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

    protected static function boot(): void
    {
        parent::boot();

        static::saved(function (self $record): void {
            FinancialCacheService::clearForUser($record->user);
        });

        static::deleted(function (self $record): void {
            FinancialCacheService::clearForUser($record->user);
        });
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
