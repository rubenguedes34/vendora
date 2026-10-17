<?php

namespace App\Http\Controllers;

use App\Http\Requests\FinancialRecord\AllocationRequest;
use App\Http\Requests\FinancialRecord\AvailableRequest;
use App\Http\Requests\FinancialRecord\StoreFinancialRecordRequest;
use App\Http\Requests\FinancialRecord\UpdateFinancialRecordRequest;
use App\Models\FinancialRecord;
use App\Models\User;
use App\Services\AvailabilityCalculator;
use App\Services\HealthScoreCalculator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class FinancialRecordController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/financial-records",
     *     tags={"Financial Records"},
     *     summary="List all financial records",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Array of financial records")
     * )
     */
    public function index(Request $request)
    {
        $records = $request->user()
            ->financialRecords()
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get();

        return response()->json($records);
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/current",
     *     tags={"Financial Records"},
     *     summary="Get current month financial record",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Current month record")
     * )
     */
    public function current(Request $request)
    {
        return response()->json(
            FinancialRecord::ensureMonth($request->user(), (int) date('Y'), (int) date('n'))
        );
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/available",
     *     tags={"Financial Records"},
     *     summary="What is left to spend in a month, with the end-of-month projection",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string", example="2026-10")),
     *
     *     @OA\Response(response=200, description="available, days_remaining, pending_income, pending_expenses, daily_avg_spend, projected_balance, daily_allowance")
     * )
     */
    public function available(AvailableRequest $request, AvailabilityCalculator $calculator)
    {
        [$year, $month] = $request->period();

        return response()->json($calculator->calculate($request->user(), $year, $month));
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/daily-balance",
     *     tags={"Financial Records"},
     *     summary="Running balance per day for a month and the previous one",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string", example="2026-10")),
     *
     *     @OA\Response(response=200, description="current and previous: one balance per day, null for days with nothing recorded yet")
     * )
     */
    public function dailyBalance(AvailableRequest $request, AvailabilityCalculator $calculator)
    {
        [$year, $month] = $request->period();

        return response()->json($calculator->dailyBalance($request->user(), $year, $month));
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/month-comparison",
     *     tags={"Financial Records"},
     *     summary="Income, expenses and savings of a month against the previous month",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string", example="2026-10")),
     *
     *     @OA\Response(response=200, description="current, previous and change_pct (null with nothing to compare), each with income, expenses, savings")
     * )
     */
    public function monthComparison(AvailableRequest $request, AvailabilityCalculator $calculator)
    {
        [$year, $month] = $request->period();

        return response()->json($calculator->comparison($request->user(), $year, $month));
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/year/{year}",
     *     tags={"Financial Records"},
     *     summary="Get financial records for a year",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="year", in="path", required=true, @OA\Schema(type="integer", example=2025)),
     *
     *     @OA\Response(response=200, description="Array of monthly records for the year")
     * )
     */
    public function byYear(Request $request, $year)
    {
        abort_unless(ctype_digit((string) $year), 422, 'Year must be a number.');

        $user = $request->user();

        // Every month from the account's start follows the default, so fill in the ones not touched yet.
        $firstMonth = (int) $year === $user->created_at->year ? $user->created_at->month : 1;
        if ((int) $year >= $user->created_at->year) {
            for ($month = $firstMonth; $month <= 12; $month++) {
                FinancialRecord::ensureMonth($user, (int) $year, $month);
            }
        }

        $records = $user->financialRecords()
            ->where('year', $year)
            ->orderBy('month', 'asc')
            ->get();

        return response()->json($records);
    }

    /**
     * @OA\Post(
     *     path="/api/financial-records",
     *     tags={"Financial Records"},
     *     summary="Create or update a financial record",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"year","month"},
     *
     *             @OA\Property(property="year", type="integer"),
     *             @OA\Property(property="month", type="integer"),
     *             @OA\Property(property="is_custom", type="boolean", description="Month uses its own base instead of the profile default"),
     *             @OA\Property(property="base_income", type="number", description="Base income when is_custom is true"),
     *             @OA\Property(property="base_expenses", type="number", description="Base expenses when is_custom is true"),
     *             @OA\Property(property="savings_goal", type="number"),
     *             @OA\Property(property="savings_goal_type", type="string", enum={"percentage","fixed"})
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Financial record saved")
     * )
     */
    public function store(StoreFinancialRecordRequest $request)
    {
        try {
            $user = $request->user();
            $record = $user->financialRecords()->firstOrNew([
                'year' => $request->year,
                'month' => $request->month,
            ]);

            $this->applyMonthSettings($record, $request->validated(), $user);
            $record = FinancialRecord::syncFromTransactions($user, $record->year, $record->month);

            return response()->json($record, 201);
        } catch (\Exception $e) {
            Log::error('Saving financial record failed', ['exception' => $e]);

            return response()->json([
                'message' => __('messages.record_save_failed'),
            ], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/{financial_record}",
     *     tags={"Financial Records"},
     *     summary="Get a single financial record",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="financial_record", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Financial record object")
     * )
     */
    public function show($id)
    {
        $record = FinancialRecord::findOrFail($id);
        $this->authorize('view', $record);

        return response()->json($record);
    }

    /**
     * @OA\Put(
     *     path="/api/financial-records/{financial_record}",
     *     tags={"Financial Records"},
     *     summary="Update a financial record",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="financial_record", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="is_custom", type="boolean", description="Month uses its own base instead of the profile default"),
     *             @OA\Property(property="base_income", type="number", description="Base income when is_custom is true"),
     *             @OA\Property(property="base_expenses", type="number", description="Base expenses when is_custom is true"),
     *             @OA\Property(property="savings_goal", type="number"),
     *             @OA\Property(property="savings_goal_type", type="string", enum={"percentage","fixed"})
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Financial record updated")
     * )
     */
    public function update(UpdateFinancialRecordRequest $request)
    {
        $record = $request->record();

        try {
            $user = $request->user();

            $this->applyMonthSettings($record, $request->validated(), $user);
            $record = FinancialRecord::syncFromTransactions($user, $record->year, $record->month);

            return response()->json($record);
        } catch (\Exception $e) {
            Log::error('Updating financial record failed', ['exception' => $e]);

            return response()->json([
                'message' => __('messages.record_update_failed'),
            ], 500);
        }
    }

    /**
     * Applies the savings goal and the custom-month flag. Income and expenses are never
     * taken from the request: they are always the base plus the month's transactions.
     *
     * @param  array<string, mixed>  $data
     */
    private function applyMonthSettings(FinancialRecord $record, array $data, User $user): void
    {
        $wasCustom = (bool) $record->is_custom;

        if (array_key_exists('is_custom', $data)) {
            $record->is_custom = (bool) $data['is_custom'];
        }

        if ($record->is_custom) {
            // Switching a month to custom starts from the default, so nothing jumps until edited.
            $record->base_income = $data['base_income']
                ?? ($wasCustom ? $record->base_income : (float) $user->monthly_income);
            $record->base_expenses = $data['base_expenses']
                ?? ($wasCustom ? $record->base_expenses : (float) $user->monthly_expenses);
        }

        if (array_key_exists('savings_goal', $data) || ! $record->exists) {
            $record->savings_goal = $data['savings_goal'] ?? $record->savings_goal ?? 0;
        }
        if (array_key_exists('savings_goal_type', $data) || ! $record->exists) {
            $record->savings_goal_type = $data['savings_goal_type'] ?? $record->savings_goal_type ?? 'fixed';
        }

        $record->user_id = $user->id;
        $record->save();
    }

    /**
     * @OA\Delete(
     *     path="/api/financial-records/{financial_record}",
     *     tags={"Financial Records"},
     *     summary="Delete a financial record",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="financial_record", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Financial record deleted")
     * )
     */
    public function destroy($id)
    {
        $record = FinancialRecord::findOrFail($id);
        $this->authorize('delete', $record);

        $record->delete();

        return response()->json(['message' => __('messages.record_deleted')]);
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/net-worth",
     *     tags={"Financial Records"},
     *     summary="Get net worth overview",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Net worth data")
     * )
     */
    public function netWorth(Request $request)
    {
        $user = $request->user();

        $result = Cache::remember(
            "net-worth:{$user->id}",
            now()->addMinutes(15),
            function () use ($user) {
                $now = now();
                $historyWindowStart = $now->copy()->subMonths(13)->startOfMonth()->toDateString();

                // Aggregates are far cheaper than hydrating every row.
                $totals = $user->transactions()
                    ->selectRaw('type, SUM(amount) as total')
                    ->groupBy('type')
                    ->pluck('total', 'type')
                    ->toArray();

                $totalIncome = (float) ($totals['income'] ?? 0);
                $totalExpenses = (float) ($totals['expense'] ?? 0);
                $cashBalance = round($totalIncome - $totalExpenses, 2);

                $investmentSummary = $user->investments()
                    ->selectRaw('SUM(initial_amount) as cost, SUM(current_amount) as value')
                    ->first();

                $investmentValue = (float) $investmentSummary?->value;
                $investmentCost = (float) $investmentSummary?->cost;
                $investGain = round($investmentValue - $investmentCost, 2);
                $investRoi = $investmentCost > 0
                    ? round(($investGain / $investmentCost) * 100, 2)
                    : 0;

                $netWorth = round($cashBalance + $investmentValue, 2);

                // Monthly / yearly deltas use filtered aggregates instead of in-memory loops.
                $monthStart = $now->copy()->startOfMonth();
                $yearStart = $now->copy()->startOfYear();

                $monthlyIncome = (float) $user->transactions()
                    ->where('type', 'income')
                    ->whereDate('transaction_date', '>=', $monthStart)
                    ->sum('amount');
                $monthlyExpense = (float) $user->transactions()
                    ->where('type', 'expense')
                    ->whereDate('transaction_date', '>=', $monthStart)
                    ->sum('amount');
                $monthlyChange = round($monthlyIncome - $monthlyExpense, 2);

                $yearlyIncome = (float) $user->transactions()
                    ->where('type', 'income')
                    ->whereDate('transaction_date', '>=', $yearStart)
                    ->sum('amount');
                $yearlyExpense = (float) $user->transactions()
                    ->where('type', 'expense')
                    ->whereDate('transaction_date', '>=', $yearStart)
                    ->sum('amount');
                $yearlyChange = round($yearlyIncome - $yearlyExpense, 2);

                // Only the last 13 months are loaded row by row; everything older
                // is folded into opening balances so the series ends at the real total.
                $transactions = $user->transactions()
                    ->whereDate('transaction_date', '>=', $historyWindowStart)
                    ->get(['type', 'transaction_date', 'amount']);
                $openingTotals = $user->transactions()
                    ->whereDate('transaction_date', '<', $historyWindowStart)
                    ->selectRaw('type, SUM(amount) as total')
                    ->groupBy('type')
                    ->pluck('total', 'type');
                $investmentRows = $user->investments()
                    ->get(['type', 'purchase_date', 'current_amount', 'initial_amount']);

                $incomeRows = $transactions->where('type', 'income')->sortBy('transaction_date')->values();
                $expenseRows = $transactions->where('type', 'expense')->sortBy('transaction_date')->values();
                $investSorted = $investmentRows
                    ->filter(fn ($inv) => $inv->purchase_date)
                    ->sortBy('purchase_date')
                    ->values();

                $incomeIdx = 0;
                $expenseIdx = 0;
                $investIdx = 0;
                $cumulativeIncome = (float) ($openingTotals['income'] ?? 0);
                $cumulativeExpense = (float) ($openingTotals['expense'] ?? 0);
                $cumulativeInvest = (float) $investmentRows
                    ->filter(fn ($inv) => ! $inv->purchase_date)
                    ->sum('current_amount');

                $history = [];
                for ($i = 12; $i >= 0; $i--) {
                    $pointEnd = $now->copy()->subMonths($i)->endOfMonth();
                    $label = $now->copy()->subMonths($i)->format('M y');

                    while ($incomeIdx < $incomeRows->count() && $incomeRows[$incomeIdx]->transaction_date <= $pointEnd) {
                        $cumulativeIncome += (float) $incomeRows[$incomeIdx]->amount;
                        $incomeIdx++;
                    }
                    while ($expenseIdx < $expenseRows->count() && $expenseRows[$expenseIdx]->transaction_date <= $pointEnd) {
                        $cumulativeExpense += (float) $expenseRows[$expenseIdx]->amount;
                        $expenseIdx++;
                    }
                    while ($investIdx < $investSorted->count() && $investSorted[$investIdx]->purchase_date <= $pointEnd) {
                        $cumulativeInvest += (float) $investSorted[$investIdx]->current_amount;
                        $investIdx++;
                    }

                    $cash = round($cumulativeIncome - $cumulativeExpense, 2);

                    $history[] = [
                        'label' => $label,
                        'net_worth' => round($cash + $cumulativeInvest, 2),
                        'cash' => $cash,
                        'investments' => round($cumulativeInvest, 2),
                    ];
                }

                // Asset allocation by investment type.
                $allocation = $user->investments()
                    ->selectRaw('type, SUM(current_amount) as value')
                    ->groupBy('type')
                    ->orderByDesc('value')
                    ->get()
                    ->map(fn ($row) => [
                        'type' => $row->type,
                        'value' => round((float) $row->value, 2),
                    ])
                    ->values();

                $allocationFull = collect([['type' => 'Cash', 'value' => max(0, $cashBalance)]])
                    ->concat($allocation)
                    ->values();

                return [
                    'net_worth' => $netWorth,
                    'cash_balance' => $cashBalance,
                    'investment_value' => $investmentValue,
                    'investment_cost' => $investmentCost,
                    'investment_gain' => $investGain,
                    'investment_roi' => $investRoi,
                    'total_income' => round($totalIncome, 2),
                    'total_expenses' => round($totalExpenses, 2),
                    'monthly_change' => $monthlyChange,
                    'yearly_change' => $yearlyChange,
                    'history' => $history,
                    'allocation' => $allocationFull,
                ];
            }
        );

        return response()->json($result);
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/allocation",
     *     tags={"Financial Records"},
     *     summary="Get investment allocation breakdown",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="account", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="date_from", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="date_to", in="query", required=false, @OA\Schema(type="string", format="date")),
     *     @OA\Parameter(name="type", in="query", required=false, @OA\Schema(type="string")),
     *
     *     @OA\Response(response=200, description="Allocation data")
     * )
     */
    public function allocation(AllocationRequest $request)
    {
        $user = $request->user();

        $query = $user->investments();

        if ($request->filled('account')) {
            $query->where('account', $request->account);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('purchase_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('purchase_date', '<=', $request->date_to);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        $total = (float) $query->clone()->sum('current_amount');

        $rows = $query
            ->selectRaw('type, SUM(current_amount) as total, COUNT(*) as count')
            ->groupBy('type')
            ->orderByDesc('total')
            ->get();

        $breakdown = $rows->map(fn ($row) => [
            'type' => $row->type,
            'total' => round((float) $row->total, 2),
            'percentage' => $total > 0 ? round(((float) $row->total / $total) * 100, 2) : 0,
            'count' => (int) $row->count,
        ])->values();

        return response()->json([
            'total' => round($total, 2),
            'breakdown' => $breakdown,
            'filters' => [
                'account' => $request->account,
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'type' => $request->type,
            ],
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/health-score",
     *     tags={"Financial Records"},
     *     summary="Get financial health score",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Health score data")
     * )
     */
    public function healthScore(Request $request, HealthScoreCalculator $calculator)
    {
        $user = $request->user();

        $result = Cache::remember(
            "health-score:{$user->id}",
            now()->addMinutes(15),
            function () use ($user, $calculator) {
                return $calculator->both($user, now(), 6);
            }
        );

        return response()->json($result);
    }
}
