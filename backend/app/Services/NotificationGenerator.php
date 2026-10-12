<?php

namespace App\Services;

use App\Models\User;
use App\Models\Budget;
use App\Models\RecurrentTransaction;
use Carbon\Carbon;

class NotificationGenerator
{
    public function generateFor(User $user): void
    {
        // A deleted notification only needs remembering while its (month-scoped) key can still be generated.
        $user->appNotifications()->onlyTrashed()->where('deleted_at', '<', now()->subDays(60))->forceDelete();

        $this->generateBudgetNotifications($user);
        $this->generateRecurringNotifications($user);
        $this->generateMonthlyReport($user);
        $this->generateSavingsGoalNotifications($user);
        $this->generateInvestmentTargetNotifications($user);
    }

    private function addOnce(User $user, string $type, string $key, string $title, string $body, array $data = []): void
    {
        // withTrashed: a notification the user deleted must not be generated again.
        $exists = $user->appNotifications()
            ->withTrashed()
            ->where('type', $type)
            ->where('data->key', $key)
            ->exists();

        if (!$exists) {
            $user->appNotifications()->create([
                'type'  => $type,
                'title' => $title,
                'body'  => $body,
                'data'  => array_merge($data, ['key' => $key]),
            ]);
        }
    }

    private function generateBudgetNotifications(User $user): void
    {
        $month = Carbon::now()->format('Y-m');
        $budgets = Budget::with('category')
            ->where('user_id', $user->id)
            ->where('month', $month)
            ->get();

        $now = Carbon::now();
        $actuals = $user->transactions()
            ->where('type', 'expense')
            ->whereYear('transaction_date', $now->year)
            ->whereMonth('transaction_date', $now->month)
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        foreach ($budgets as $budget) {
            $limit  = (float) $budget->amount;
            if ($limit <= 0) continue;

            $actual = (float) ($actuals[$budget->category_id] ?? 0);
            $key    = "budget-{$budget->id}-{$month}";

            if ($actual > $limit) {
                // Superseded, not dismissed: hard delete so it can come back if spending drops below the limit.
                $user->appNotifications()
                    ->where('type', 'budget_almost_exceeded')
                    ->where('data->key', $key)
                    ->forceDelete();

                $this->addOnce(
                    $user,
                    'budget_exceeded',
                    $key,
                    'Budget exceeded',
                    "You exceeded your {$budget->category->name} budget by {$this->money($actual - $limit)}.",
                    ['budget_id' => $budget->id, 'category' => $budget->category->name]
                );
            } elseif ($actual >= $limit * 0.8) {
                $this->addOnce(
                    $user,
                    'budget_almost_exceeded',
                    $key,
                    'Budget almost exceeded',
                    "You have used {$this->pct($actual, $limit)} of your {$budget->category->name} budget.",
                    ['budget_id' => $budget->id, 'category' => $budget->category->name]
                );
            }
        }
    }

    private function generateRecurringNotifications(User $user): void
    {
        $today = Carbon::today();

        $rules = RecurrentTransaction::where('user_id', $user->id)
            ->where('is_active', true)
            ->get();

        foreach ($rules as $rt) {
            // day_of_month is validated to 1-28, so the date exists in every month.
            $dueDate = $today->copy()->day((int) ($rt->day_of_month ?? 1));

            // Skip rules not yet due this month, or created after their due date this month.
            if ($dueDate->gt($today) || $rt->created_at->gt($dueDate->copy()->endOfDay())) {
                continue;
            }

            // One notification per rule and month, created on the first generation on/after the due day.
            $this->addOnce(
                $user,
                'recurring_due',
                'recurring-' . $dueDate->format('Y-m') . "-{$rt->id}",
                'Recurring transaction due',
                $dueDate->isSameDay($today)
                    ? "{$rt->description} is due today."
                    : "{$rt->description} was due on {$dueDate->format('M j')}.",
                ['recurrent_transaction_id' => $rt->id]
            );
        }
    }

    private function generateMonthlyReport(User $user): void
    {
        $month = Carbon::now()->format('F Y');
        $key   = 'monthly-report-' . Carbon::now()->format('Y-m');

        $this->addOnce(
            $user,
            'monthly_report_ready',
            $key,
            'Monthly report ready',
            "Your financial summary for {$month} is ready to view.",
            ['month' => $month]
        );
    }

    private function generateSavingsGoalNotifications(User $user): void
    {
        $month = Carbon::now()->format('Y-m');
        $key   = 'savings-goal-' . $month;

        $income  = (float) $user->transactions()->where('type', 'income')->whereMonth('transaction_date', Carbon::now()->month)->whereYear('transaction_date', Carbon::now()->year)->sum('amount');
        $expense = (float) $user->transactions()->where('type', 'expense')->whereMonth('transaction_date', Carbon::now()->month)->whereYear('transaction_date', Carbon::now()->year)->sum('amount');
        $saved   = max(0, $income - $expense);

        $target = (float) $user->monthly_income;
        if ($target > 0 && $saved >= $target * 0.2) {
            $this->addOnce(
                $user,
                'savings_goal_completed',
                $key,
                'Savings goal reached',
                "You saved {$this->money($saved)} this month (≥20% of income).",
                ['saved' => $saved]
            );
        }
    }

    private function generateInvestmentTargetNotifications(User $user): void
    {
        $month = Carbon::now()->format('Y-m');
        $key   = 'investment-target-' . $month;

        $investments = $user->investments()->get();
        if ($investments->isEmpty()) return;

        $totalCurrent = (float) $investments->sum('current_amount');
        $totalCost    = (float) $investments->sum('initial_amount');

        if ($totalCost > 0 && $totalCurrent >= $totalCost * 1.10) {
            $gain = $totalCurrent - $totalCost;
            $this->addOnce(
                $user,
                'investment_reached_target',
                $key,
                'Investment target reached',
                "Your portfolio is up {$this->money($gain)} (+{$this->pct($totalCurrent, $totalCost, true)}).",
                ['gain' => $gain]
            );
        }
    }

    private function money(float $amount): string
    {
        return '$' . number_format($amount, 2);
    }

    private function pct(float $part, float $whole, bool $asGain = false): string
    {
        if ($whole <= 0) return '0%';
        $value = round((($part - ($asGain ? $whole : 0)) / $whole) * 100, 1);
        return number_format($value, 1) . '%';
    }
}
