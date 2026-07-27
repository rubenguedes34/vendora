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

    public static function syncFromTransactions(User $user, int $year, int $month): void
    {
        $start = now()->setDate($year, $month, 1)->startOfMonth();
        $end = now()->setDate($year, $month, 1)->endOfMonth();

        $monthlyIncome = (float) $user->transactions()
            ->where('type', 'income')
            ->whereBetween('transaction_date', [$start, $end])
            ->sum('amount');

        $monthlyExpenses = (float) $user->transactions()
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$start, $end])
            ->sum('amount');

        $record = $user->financialRecords()->firstOrNew(['year' => $year, 'month' => $month]);
        $record->user_id = $user->id;
        $record->monthly_income = $monthlyIncome;
        $record->monthly_expenses = $monthlyExpenses;

        if (is_null($record->savings_goal)) {
            $record->savings_goal = 0;
        }
        if (is_null($record->savings_goal_type)) {
            $record->savings_goal_type = 'fixed';
        }

        $record->save();
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
