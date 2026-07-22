<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

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
        $month = $asOf->format('Y-m');

        $lookbackStart = $asOf->copy()->subMonths(6)->startOfMonth();

        $recentTransactions = $user->transactions()
            ->select(['type', 'transaction_date', 'amount', 'category_id'])
            ->where('transaction_date', '>=', $lookbackStart)
            ->get();

        $totalIncome = (float) $user->transactions()->where('type', 'income')->sum('amount');
        $totalExpense = (float) $user->transactions()->where('type', 'expense')->sum('amount');
        $investmentValue = (float) $user->investments()->sum('current_amount');

        $budgets = $user->budgets()
            ->where('month', $month)
            ->get(['category_id', 'amount', 'month']);

        $maps = $this->buildMaps($recentTransactions, $totalIncome, $totalExpense);

        return $this->evaluate($asOf, $maps, $budgets, $investmentValue, $user);
    }

    public function history(User $user, int $months = 6): array
    {
        $now = Carbon::today();
        $lookbackStart = $now->copy()->subMonths($months)->startOfMonth();

        $recentTransactions = $user->transactions()
            ->select(['type', 'transaction_date', 'amount', 'category_id'])
            ->where('transaction_date', '>=', $lookbackStart)
            ->get();

        $totalIncome = (float) $user->transactions()->where('type', 'income')->sum('amount');
        $totalExpense = (float) $user->transactions()->where('type', 'expense')->sum('amount');
        $investmentValue = (float) $user->investments()->sum('current_amount');

        $startMonth = $now->copy()->subMonths($months - 1)->format('Y-m');
        $endMonth = $now->format('Y-m');

        $budgets = $user->budgets()
            ->whereBetween('month', [$startMonth, $endMonth])
            ->get(['category_id', 'amount', 'month']);

        $maps = $this->buildMaps($recentTransactions, $totalIncome, $totalExpense);

        $history = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $date = $now->copy()->subMonths($i);
            $monthBudgets = $budgets->where('month', $date->format('Y-m'))->values();
            $result = $this->evaluate($date, $maps, $monthBudgets, $investmentValue, $user);
            $history[] = [
                'month' => $date->format('M y'),
                'score' => $result['overall_score'],
            ];
        }

        return $history;
    }

    public function both(User $user, ?Carbon $asOf = null, int $historyMonths = 6): array
    {
        $asOf ??= Carbon::today();
        $month = $asOf->format('Y-m');
        $historyStart = $asOf->copy()->subMonths($historyMonths)->startOfMonth();
        $lookbackStart = $asOf->copy()->subMonths(6)->startOfMonth()->min($historyStart);

        $recentTransactions = $user->transactions()
            ->select(['type', 'transaction_date', 'amount', 'category_id'])
            ->where('transaction_date', '>=', $lookbackStart)
            ->get();

        $totalIncome = (float) $user->transactions()->where('type', 'income')->sum('amount');
        $totalExpense = (float) $user->transactions()->where('type', 'expense')->sum('amount');
        $investmentValue = (float) $user->investments()->sum('current_amount');

        $maps = $this->buildMaps($recentTransactions, $totalIncome, $totalExpense);

        $startMonth = $asOf->copy()->subMonths($historyMonths - 1)->format('Y-m');
        $endMonth = $month;

        $budgets = $user->budgets()
            ->whereBetween('month', [$startMonth, $endMonth])
            ->get(['category_id', 'amount', 'month']);

        $currentBudgets = $budgets->where('month', $month)->values();
        $score = $this->evaluate($asOf, $maps, $currentBudgets, $investmentValue, $user);

        $history = [];
        for ($i = $historyMonths - 1; $i >= 0; $i--) {
            $date = $asOf->copy()->subMonths($i);
            $monthBudgets = $budgets->where('month', $date->format('Y-m'))->values();
            $result = $this->evaluate($date, $maps, $monthBudgets, $investmentValue, $user);
            $history[] = [
                'month' => $date->format('M y'),
                'score' => $result['overall_score'],
            ];
        }

        return [
            'score' => $score,
            'history' => $history,
        ];
    }

    private function buildMaps(Collection $transactions, float $totalIncome, float $totalExpense): array
    {
        $incomeByMonth = [];
        $expenseByMonth = [];
        $expenseByCategoryMonth = [];

        foreach ($transactions as $t) {
            $amount = (float) $t->amount;
            $month = $t->transaction_date ? $t->transaction_date->format('Y-m') : null;

            if (!$month) {
                continue;
            }

            if ($t->type === 'income') {
                $incomeByMonth[$month] = ($incomeByMonth[$month] ?? 0) + $amount;
                continue;
            }

            if ($t->type === 'expense') {
                $expenseByMonth[$month] = ($expenseByMonth[$month] ?? 0) + $amount;
                $categoryId = $t->category_id ?? 0;
                $expenseByCategoryMonth[$month][$categoryId] = ($expenseByCategoryMonth[$month][$categoryId] ?? 0) + $amount;
            }
        }

        return [
            'income_by_month' => $incomeByMonth,
            'expense_by_month' => $expenseByMonth,
            'expense_by_category_month' => $expenseByCategoryMonth,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
        ];
    }

    private function evaluate(Carbon $asOf, array $maps, Collection $budgets, float $investmentValue, User $user): array
    {
        $month = $asOf->format('Y-m');
        $income = $maps['income_by_month'][$month] ?? 0.0;
        $expense = $maps['expense_by_month'][$month] ?? 0.0;
        $cash = $maps['total_income'] - $maps['total_expense'];

        $monthlyExpenses = (float) $user->monthly_expenses;
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

        $expenseByCategory = $maps['expense_by_category_month'][$month] ?? [];
        $categories[] = $this->calculateBudgetAdherence($budgets, $expenseByCategory);
        $categories[] = $this->category('Debt ratio', 'debt_ratio', 0, [
            [0, 100, 'No recorded debt — great position.'],
        ], '', 'Debt data is not tracked yet; add debt accounts to refine this score.');

        $investmentRate = $income > 0 ? $investmentValue / $income : 0;
        $categories[] = $this->category('Investment rate', 'investment_rate', $investmentRate * 100, [
            [50, 100, 'Excellent investment rate.'],
            [30, 80, 'Strong focus on growing assets.'],
            [10, 60, 'Moderate. Consider increasing contributions.'],
            [0, 30, 'Low investment rate. Small regular contributions help.'],
        ]);

        $categories[] = $this->calculateIncomeStability($asOf, $maps['income_by_month']);

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

    private function calculateBudgetAdherence(Collection $budgets, array $expenseByCategory): array
    {
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

        $total = 0;
        $bad   = 0;
        foreach ($budgets as $b) {
            $total++;
            $budgeted = (float) $b->amount;
            $spent    = (float) ($expenseByCategory[$b->category_id] ?? 0);
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

    private function calculateIncomeStability(Carbon $asOf, array $incomeByMonth): array
    {
        $values = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $asOf->copy()->subMonths($i)->format('Y-m');
            $values[] = $incomeByMonth[$month] ?? 0.0;
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
        $cv       = $stdDev / $avg;

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
