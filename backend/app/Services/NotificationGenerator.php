<?php

namespace App\Services;

use App\Models\AlertRule;
use App\Models\Budget;
use App\Models\RecurrentTransaction;
use App\Models\User;
use App\Notifications\AppAlertMail;
use App\Support\EmailGate;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class NotificationGenerator
{
    public function generateFor(User $user): void
    {
        // A deleted notification only needs remembering while its (month-scoped) key can still be generated.
        $user->appNotifications()->onlyTrashed()->where('deleted_at', '<', now()->subDays(60))->forceDelete();

        $this->generateBudgetNotifications($user);
        $this->generateAlertRuleNotifications($user);
        $this->generateRecurringNotifications($user);
        $this->generateMonthlyReport($user);
        $this->generateSavingsGoalNotifications($user);
        $this->generateInvestmentTargetNotifications($user);
    }

    private function addOnce(User $user, string $type, string $key, string $title, string $body, array $data = [], array $i18n = []): void
    {
        // withTrashed: a notification the user deleted must not be generated again.
        $exists = $user->appNotifications()
            ->withTrashed()
            ->where('type', $type)
            ->where('data->key', $key)
            ->exists();

        if (! $exists) {
            $user->appNotifications()->create([
                'type' => $type,
                'title' => $title,
                'body' => $body,
                // English title/body stay as the fallback; the SPA translates from data.i18n when present.
                'data' => array_merge($data, ['key' => $key], $i18n ? ['i18n' => $i18n] : []),
            ]);
            Log::info('Notification created', ['user_id' => $user->id, 'type' => $type, 'key' => $key]);

            // Only types listed in EmailGate::TYPES are emailed, and only the first time (addOnce dedupes).
            if (isset(EmailGate::TYPES[$type]) && $i18n) {
                EmailGate::send($user, new AppAlertMail($i18n['key'], $i18n['params'] ?? []), $type);
            }
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
            $limit = (float) $budget->amount;
            if ($limit <= 0) {
                continue;
            }

            $actual = (float) ($actuals[$budget->category_id] ?? 0);
            $key = "budget-{$budget->id}-{$month}";

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
                    ['budget_id' => $budget->id, 'category' => $budget->category->name],
                    ['key' => 'budget_exceeded', 'params' => ['category' => $budget->category->name, 'amount' => $this->money($actual - $limit)]]
                );
            } elseif ($actual >= $limit * 0.8) {
                $this->addOnce(
                    $user,
                    'budget_almost_exceeded',
                    $key,
                    'Budget almost exceeded',
                    "You have used {$this->pct($actual, $limit)} of your {$budget->category->name} budget.",
                    ['budget_id' => $budget->id, 'category' => $budget->category->name],
                    ['key' => 'budget_almost_exceeded', 'params' => ['category' => $budget->category->name, 'percent' => $this->pct($actual, $limit)]]
                );
            }
        }
    }

    // shortcut: monthly period and a single threshold per rule (no 80% warning); add a period/warn level if asked.
    private function generateAlertRuleNotifications(User $user): void
    {
        $rules = $user->alertRules()->with('category')->where('is_active', true)->get();
        if ($rules->isEmpty()) {
            return;
        }

        $now = Carbon::now();
        $month = $now->format('Y-m');
        $byCategory = $user->transactions()
            ->where('type', 'expense')
            ->whereYear('transaction_date', $now->year)
            ->whereMonth('transaction_date', $now->month)
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');
        $total = (float) $byCategory->sum();

        foreach ($rules as $rule) {
            $limit = (float) $rule->threshold;
            $isCategory = $rule->type === AlertRule::TYPE_CATEGORY_LIMIT;
            $spent = $isCategory ? (float) ($byCategory[$rule->category_id] ?? 0) : $total;

            if ($spent < $limit) {
                continue;
            }

            $what = $isCategory ? "on {$rule->category?->name}" : 'this month';
            // The limit is in the key, so raising it later can alert again for the same month.
            $this->addOnce(
                $user,
                'alert_rule_triggered',
                "alert-rule-{$rule->id}-{$month}-".number_format($limit, 2, '.', ''),
                'Spending limit reached',
                "You have spent {$this->money($spent)} {$what}, reaching your limit of {$this->money($limit)}.",
                ['alert_rule_id' => $rule->id, 'category' => $rule->category?->name],
                [
                    'key' => $isCategory ? 'alert_rule_category' : 'alert_rule_total',
                    'params' => ['category' => $rule->category?->name, 'spent' => $this->money($spent), 'limit' => $this->money($limit)],
                ]
            );
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
                'recurring-'.$dueDate->format('Y-m')."-{$rt->id}",
                'Recurring transaction due',
                $dueDate->isSameDay($today)
                    ? "{$rt->description} is due today."
                    : "{$rt->description} was due on {$dueDate->format('M j')}.",
                ['recurrent_transaction_id' => $rt->id],
                [
                    'key' => $dueDate->isSameDay($today) ? 'recurring_due_today' : 'recurring_due_past',
                    'params' => ['description' => $rt->description, 'date' => $dueDate->toDateString()],
                ]
            );
        }
    }

    private function generateMonthlyReport(User $user): void
    {
        // The report is for the month that just ended, so the notification (and its email) never describes a month in progress.
        $last = Carbon::now()->subMonthNoOverflow();
        $month = $last->format('F Y');
        $key = 'monthly-report-'.$last->format('Y-m');

        $this->addOnce(
            $user,
            'monthly_report_ready',
            $key,
            'Monthly report ready',
            "Your financial summary for {$month} is ready to view.",
            ['month' => $month],
            ['key' => 'monthly_report_ready', 'params' => ['month' => $last->format('Y-m')]]
        );
    }

    private function generateSavingsGoalNotifications(User $user): void
    {
        $month = Carbon::now()->format('Y-m');
        $key = 'savings-goal-'.$month;

        $income = (float) $user->transactions()->where('type', 'income')->whereMonth('transaction_date', Carbon::now()->month)->whereYear('transaction_date', Carbon::now()->year)->sum('amount');
        $expense = (float) $user->transactions()->where('type', 'expense')->whereMonth('transaction_date', Carbon::now()->month)->whereYear('transaction_date', Carbon::now()->year)->sum('amount');
        $saved = max(0, $income - $expense);

        $target = (float) $user->monthly_income;
        if ($target > 0 && $saved >= $target * 0.2) {
            $this->addOnce(
                $user,
                'savings_goal_completed',
                $key,
                'Savings goal reached',
                "You saved {$this->money($saved)} this month (≥20% of income).",
                ['saved' => $saved],
                ['key' => 'savings_goal_completed', 'params' => ['saved' => $this->money($saved)]]
            );
        }
    }

    private function generateInvestmentTargetNotifications(User $user): void
    {
        $month = Carbon::now()->format('Y-m');
        $key = 'investment-target-'.$month;

        $investments = $user->investments()->get();
        if ($investments->isEmpty()) {
            return;
        }

        $totalCurrent = (float) $investments->sum('current_amount');
        $totalCost = (float) $investments->sum('initial_amount');

        if ($totalCost > 0 && $totalCurrent >= $totalCost * 1.10) {
            $gain = $totalCurrent - $totalCost;
            $this->addOnce(
                $user,
                'investment_reached_target',
                $key,
                'Investment target reached',
                "Your portfolio is up {$this->money($gain)} (+{$this->pct($totalCurrent, $totalCost, true)}).",
                ['gain' => $gain],
                ['key' => 'investment_reached_target', 'params' => ['gain' => $this->money($gain), 'percent' => $this->pct($totalCurrent, $totalCost, true)]]
            );
        }
    }

    // Currency is a client-side preference, so amounts carry a '$' placeholder that the SPA swaps (currencyText pipe).
    private function money(float $amount): string
    {
        return '$'.number_format($amount, 2);
    }

    private function pct(float $part, float $whole, bool $asGain = false): string
    {
        if ($whole <= 0) {
            return '0%';
        }
        $value = round((($part - ($asGain ? $whole : 0)) / $whole) * 100, 1);

        return number_format($value, 1).'%';
    }
}
