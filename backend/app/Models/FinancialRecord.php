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
 * @property bool $is_custom
 * @property float $base_income
 * @property float $base_expenses
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
        'is_custom',
        'base_income',
        'base_expenses',
        'savings_goal',
        'savings_goal_type',
    ];

    protected $casts = [
        'is_custom' => 'boolean',
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

    /**
     * A month is its base (the user's default, or the month's own values when
     * it is flagged as custom) plus whatever its transactions add to it.
     */
    public static function syncFromTransactions(User $user, int $year, int $month): self
    {
        $start = now()->setDate($year, $month, 1)->startOfMonth();
        $end = now()->setDate($year, $month, 1)->endOfMonth();

        $totals = $user->transactions()
            ->whereBetween('transaction_date', [$start, $end])
            ->selectRaw('type, SUM(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $record = $user->financialRecords()->firstOrNew(['year' => $year, 'month' => $month]);
        $record->user_id = $user->id;

        $baseIncome = $record->is_custom ? (float) $record->base_income : (float) $user->monthly_income;
        $baseExpenses = $record->is_custom ? (float) $record->base_expenses : (float) $user->monthly_expenses;

        $record->monthly_income = $baseIncome + (float) ($totals['income'] ?? 0);
        $record->monthly_expenses = $baseExpenses + (float) ($totals['expense'] ?? 0);

        if (is_null($record->savings_goal)) {
            $record->savings_goal = 0;
        }
        if (is_null($record->savings_goal_type)) {
            $record->savings_goal_type = 'fixed';
        }

        $record->save();

        return $record;
    }

    /**
     * The month's record, derived on first use so every month shows the default plus its transactions.
     */
    public static function ensureMonth(User $user, int $year, int $month): self
    {
        return $user->financialRecords()->where(['year' => $year, 'month' => $month])->first()
            ?? self::syncFromTransactions($user, $year, $month);
    }

    /**
     * Re-derives every month that follows the user's default, e.g. after the default changed.
     */
    public static function syncDefaultMonths(User $user): void
    {
        $user->financialRecords()
            ->where('is_custom', false)
            ->get()
            ->each(fn (self $record) => self::syncFromTransactions($user, $record->year, $record->month));
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
