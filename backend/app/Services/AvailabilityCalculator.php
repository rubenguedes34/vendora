<?php

namespace App\Services;

use App\Models\FinancialRecord;
use App\Models\User;
use Carbon\Carbon;

class AvailabilityCalculator
{
    /**
     * What is left in a month, what is still due from recurrent transactions, and where the month will end.
     * Only the current month has days left to project; past and future months report their plain balance.
     */
    public function calculate(User $user, int $year, int $month, ?Carbon $today = null): array
    {
        $today ??= Carbon::today();

        $record = FinancialRecord::ensureMonth($user, $year, $month);
        $income = (float) $record->monthly_income;
        $expenses = (float) $record->monthly_expenses;

        $daysInMonth = Carbon::create($year, $month, 1)->daysInMonth;
        $isCurrent = $today->year === $year && $today->month === $month;
        $isFuture = Carbon::create($year, $month, 1)->gt($today);
        // A month still to come has all its days left; a past one has none.
        $dayOfMonth = $isCurrent ? $today->day : ($isFuture ? 0 : $daysInMonth);
        $daysRemaining = $daysInMonth - $dayOfMonth;
        // Something due today that has not been copied yet is still to come; in a past month nothing is.
        $firstPendingDay = $isCurrent ? $dayOfMonth : $dayOfMonth + 1;

        [$pendingIncome, $pendingExpenses, $recurrentSpent] = $this->recurrents($user, $year, $month, $daysInMonth, $firstPendingDay);

        // The base is a full-month plan, not money spent so far; only what transactions added is extrapolated.
        $baseExpenses = $record->is_custom ? (float) $record->base_expenses : (float) $user->monthly_expenses;
        $variableSpent = max(0, $expenses - $baseExpenses - $recurrentSpent);
        $dailyAvgSpend = $dayOfMonth > 0 ? $variableSpent / $dayOfMonth : 0;

        $available = $income - $expenses;
        $dueBalance = $available + $pendingIncome - $pendingExpenses;

        return [
            'year' => $year,
            'month' => $month,
            'available' => round($available, 2),
            'days_remaining' => $daysRemaining,
            'pending_income' => round($pendingIncome, 2),
            'pending_expenses' => round($pendingExpenses, 2),
            'daily_avg_spend' => round($dailyAvgSpend, 2),
            'projected_balance' => round($dueBalance - $dailyAvgSpend * $daysRemaining, 2),
            'daily_allowance' => $daysRemaining > 0 ? round(max(0, $dueBalance) / $daysRemaining, 2) : 0,
        ];
    }

    /**
     * Income, expenses and savings of a month against the month before it (also across a year boundary).
     * A percentage is null when the earlier month has nothing to compare against.
     */
    public function comparison(User $user, int $year, int $month): array
    {
        $previousMonth = Carbon::create($year, $month, 1)->subMonthNoOverflow();
        $totals = function (int $y, int $m) use ($user): array {
            $record = FinancialRecord::ensureMonth($user, $y, $m);
            $income = (float) $record->monthly_income;
            $expenses = (float) $record->monthly_expenses;

            return ['income' => $income, 'expenses' => $expenses, 'savings' => $income - $expenses];
        };

        $current = $totals($year, $month);
        $previous = $totals($previousMonth->year, $previousMonth->month);

        $changePct = [];
        foreach ($current as $key => $value) {
            $changePct[$key] = $previous[$key] != 0 ? round(($value - $previous[$key]) / abs($previous[$key]) * 100, 1) : null;
        }

        return ['current' => $current, 'previous' => $previous, 'change_pct' => $changePct];
    }

    /**
     * Running balance for each day of the month and of the one before it, to chart them against each other.
     * A day with nothing recorded yet (after today, or a month still to come) is null so the line stops there.
     *
     * @return array{current: array<int, float|null>, previous: array<int, float|null>}
     */
    public function dailyBalance(User $user, int $year, int $month, ?Carbon $today = null): array
    {
        $today ??= Carbon::today();
        $previous = Carbon::create($year, $month, 1)->subMonthNoOverflow();

        return [
            'current' => $this->monthSeries($user, $year, $month, $today),
            'previous' => $this->monthSeries($user, $previous->year, $previous->month, $today),
        ];
    }

    private function monthSeries(User $user, int $year, int $month, Carbon $today): array
    {
        $record = FinancialRecord::ensureMonth($user, $year, $month);
        $daysInMonth = Carbon::create($year, $month, 1)->daysInMonth;

        $lastDay = match (true) {
            $today->year === $year && $today->month === $month => $today->day,
            Carbon::create($year, $month, 1)->lt($today->copy()->startOfMonth()) => $daysInMonth,
            default => 0,
        };

        $netByDay = $user->transactions()
            ->whereDate('transaction_date', '>=', sprintf('%04d-%02d-01', $year, $month))
            ->whereDate('transaction_date', '<=', sprintf('%04d-%02d-%02d', $year, $month, $daysInMonth))
            ->selectRaw("DATE(transaction_date) as day, SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net")
            ->groupBy('day')
            ->pluck('net', 'day');

        $balance = $record->is_custom
            ? (float) $record->base_income - (float) $record->base_expenses
            : (float) $user->monthly_income - (float) $user->monthly_expenses;

        $series = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $balance += (float) ($netByDay[sprintf('%04d-%02d-%02d', $year, $month, $day)] ?? 0);
            $series[] = $day <= $lastDay ? round($balance, 2) : null;
        }

        return $series;
    }

    /**
     * Active recurrent templates are only money once copied to the month, so the ones not copied yet and due
     * from $firstPendingDay on are "pending". Matching uses the same fields as
     * RecurrentTransactionController::copyToMonth, including its clamp of day 31 to a short month's last day.
     *
     * @return array{float, float, float} pending income, pending expenses, expenses already copied from recurrents
     */
    private function recurrents(User $user, int $year, int $month, int $daysInMonth, int $firstPendingDay): array
    {
        $pendingIncome = $pendingExpenses = $copiedExpenses = 0.0;

        foreach ($user->recurrentTransactions()->where('is_active', true)->get() as $recurrent) {
            $dueDay = min($recurrent->day_of_month, $daysInMonth);
            $copied = $user->transactions()
                ->where('description', $recurrent->description)
                ->where('category_id', $recurrent->category_id)
                ->where('amount', $recurrent->amount)
                ->where('type', $recurrent->type)
                ->whereDate('transaction_date', sprintf('%04d-%02d-%02d', $year, $month, $dueDay))
                ->exists();

            if ($copied && $recurrent->type === 'expense') {
                $copiedExpenses += $recurrent->amount;
            } elseif (! $copied && $dueDay >= $firstPendingDay) {
                $recurrent->type === 'income' ? $pendingIncome += $recurrent->amount : $pendingExpenses += $recurrent->amount;
            }
        }

        return [$pendingIncome, $pendingExpenses, $copiedExpenses];
    }
}
