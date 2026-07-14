<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;

class HealthScoreCalculator
{
    private array $weights = [
        'savings_rate'       => 25,
        'emergency_fund'   => 20,
        'budget_adherence' => 20,
        'debt_ratio'       => 15,
        'investment_rate'  => 10,
        'income_stability' => 10,
    ];

    public function __construct(array $weights = [])
    {
        $this->weights = array_merge($this->weights, $weights);
    }

    public function calculate(User $user, ?Carbon $asOf = null): array
    {
        $asOf ??= Carbon::today();
        $monthStart = $asOf->copy()->startOfMonth();
        $monthEnd   = $asOf->copy()->endOfMonth();

        $income  = (float) $user->transactions()
            ->where('type', 'income')
            ->whereBetween('transaction_date', [$monthStart, $monthEnd])
            ->sum('amount');

        $expense = (float) $user->transactions()
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$monthStart, $monthEnd])
            ->sum('amount');

        $totalIncomeAllTime = (float) $user->transactions()->where('type', 'income')->sum('amount');
        $totalExpenseAllTime = (float) $user->transactions()->where('type', 'expense')->sum('amount');
        $cash = $totalIncomeAllTime - $totalExpenseAllTime;

        $monthlyExpenses = (float) $user->monthly_expenses;
        $monthlyIncome   = (float) $user->monthly_income;

        $savingsRate = $income > 0 ? ($income - $expense) / $income : 0;

        $categories = [];
        $categories[] = $this->category('Savings rate', 'savings_rate', $savingsRate * 100, [
            [30, 100, 'Excellent — keep saving at this pace.'],
            [20, 80, 'Good, but aim for 30% to build wealth faster.'],
            [10, 60, 'Moderate. Try to reduce discretionary spending.'],
            [0, 40, 'Low savings rate. Build an emergency fund first.'],
            [-1000, 0, 'Negative savings. Review your budget immediately.'],
        ]);

        $emergencyMonths = $monthlyExpenses > 0 ? $cash / $monthlyExpenses : 0;
        $categories[] = $this->category('Emergency fund', 'emergency_fund', min($emergencyMonths, 12), [
            [6, 100, 'You have 6+ months of expenses saved.'],
            [3, 80, 'Solid cushion. Target 6 months for extra security.'],
            [1, 50, 'Minimum cushion. Prioritize building reserves.'],
            [0, 0, 'No emergency fund. Set aside cash before investing.'],
        ], 'months');

        $categories[] = $this->calculateBudgetAdherence($user, $asOf);
        $categories[] = $this->category('Debt ratio', 'debt_ratio', 0, [
            [0, 100, 'No recorded debt — great position.'],
        ], '', 'Debt data is not tracked yet; add debt accounts to refine this score.');

        $investmentValue = (float) $user->investments()->sum('current_amount');
        $investmentRate  = $income > 0 ? $investmentValue / $income : 0;
        $categories[] = $this->category('Investment rate', 'investment_rate', $investmentRate * 100, [
            [50, 100, 'Excellent investment rate.'],
            [30, 80, 'Strong focus on growing assets.'],
            [10, 60, 'Moderate. Consider increasing contributions.'],
            [0, 30, 'Low investment rate. Small regular contributions help.'],
        ]);

        $categories[] = $this->calculateIncomeStability($user, $asOf);

        $overall = 0;
        foreach ($categories as $c) {
            $overall += $c['score'] * ($this->weights[$c['key']] / 100);
        }

        return [
            'overall_score' => (int) round(min(100, max(0, $overall))),
            'as_of'         => $asOf->toDateString(),
            'details'       => [
                'income'  => round($income, 2),
                'expense' => round($expense, 2),
                'cash'    => round($cash, 2),
            ],
            'categories' => $categories,
            'weights'    => $this->weights,
        ];
    }

    public function history(User $user, int $months = 6): array
    {
        $history = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date = Carbon::today()->subMonths($i);
            $result = $this->calculate($user, $date);
            $history[] = [
                'month' => $date->format('M y'),
                'score' => $result['overall_score'],
            ];
        }
        return $history;
    }

    private function calculateBudgetAdherence(User $user, Carbon $asOf): array
    {
        $month = $asOf->format('Y-m');
        $budgets = $user->budgets()->with('category')->where('month', $month)->get();

        if ($budgets->isEmpty()) {
            return [
                'name'        => 'Budget adherence',
                'key'         => 'budget_adherence',
                'weight'      => $this->weights['budget_adherence'] ?? 0,
                'score'       => 100,
                'value'       => null,
                'unit'        => '',
                'suggestion'  => 'No budgets set for this month.',
                'description' => '',
            ];
        }

        $actuals = $user->transactions()
            ->where('type', 'expense')
            ->whereBetween('transaction_date', [$asOf->copy()->startOfMonth(), $asOf->copy()->endOfMonth()])
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        $total = 0;
        $bad   = 0;
        foreach ($budgets as $b) {
            $total++;
            $budgeted = (float) $b->amount;
            $spent    = (float) ($actuals[$b->category_id] ?? 0);
            $pct      = $budgeted > 0 ? $spent / $budgeted : 0;
            if ($pct > 1.0) $bad++;
        }

        $score = $total > 0 ? (int) round((($total - $bad) / $total) * 100) : 100;
        $suggestion = $score === 100
            ? 'All budgets on track this month.'
            : ($bad . ' budget' . ($bad !== 1 ? 's' : '') . ' exceeded. Review overspending categories.');

        return [
            'name'        => 'Budget adherence',
            'key'         => 'budget_adherence',
            'weight'      => $this->weights['budget_adherence'] ?? 0,
            'score'       => $score,
            'value'       => round((($total - $bad) / $total) * 100, 1),
            'unit'        => '%',
            'suggestion'  => $suggestion,
            'description' => 'Percent of monthly budgets not exceeded',
        ];
    }

    private function calculateIncomeStability(User $user, Carbon $asOf): array
    {
        $months = [];
        $values = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $asOf->copy()->subMonths($i);
            $val = (float) $user->transactions()
                ->where('type', 'income')
                ->whereYear('transaction_date', $month->year)
                ->whereMonth('transaction_date', $month->month)
                ->sum('amount');
            $months[] = $month->format('M');
            $values[] = $val;
        }

        $avg = array_sum($values) / max(1, count($values));
        if ($avg <= 0) {
            return [
                'name'        => 'Income stability',
                'key'         => 'income_stability',
                'weight'      => $this->weights['income_stability'] ?? 0,
                'score'       => 100,
                'value'       => null,
                'unit'        => '',
                'suggestion'  => 'No income recorded yet.',
                'description' => '',
            ];
        }

        $variance = array_sum(array_map(fn ($v) => pow($v - $avg, 2), $values)) / count($values);
        $stdDev   = sqrt($variance);
        $cv       = $stdDev / $avg; // coefficient of variation

        $score = $cv < 0.1 ? 100 : ($cv < 0.3 ? 80 : ($cv < 0.6 ? 50 : 20));
        $suggestion = $score >= 80
            ? 'Income is stable month to month.'
            : 'Income varies significantly. Build a larger emergency fund to smooth gaps.';

        return [
            'name'        => 'Income stability',
            'key'         => 'income_stability',
            'weight'      => $this->weights['income_stability'] ?? 0,
            'score'       => $score,
            'value'       => round($cv * 100, 1),
            'unit'        => '%',
            'suggestion'  => $suggestion,
            'description' => 'Income variability (lower is better)',
        ];
    }

    private function category(string $name, string $key, float $value, array $thresholds, string $unit = '%', ?string $fallbackSuggestion = null): array
    {
        usort($thresholds, fn ($a, $b) => $b[0] <=> $a[0]);

        $score = 0;
        $suggestion = $fallbackSuggestion ?? 'No data available.';
        foreach ($thresholds as $t) {
            if ($value >= $t[0]) {
                $score = $t[1];
                $suggestion = $t[2];
                break;
            }
        }

        return [
            'name'        => $name,
            'key'         => $key,
            'weight'      => $this->weights[$key] ?? 0,
            'score'       => $score,
            'value'       => round($value, 1),
            'unit'        => $unit,
            'suggestion'  => $suggestion,
            'description' => '',
        ];
    }
}
