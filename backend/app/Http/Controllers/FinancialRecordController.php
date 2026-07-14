<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Cache;
use App\Models\FinancialRecord;
use App\Services\HealthScoreCalculator;

class FinancialRecordController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/financial-records",
     *     tags={"Financial Records"},
     *     summary="List all financial records",
     *     security={{"bearerAuth":{}}},
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
     *     @OA\Response(response=200, description="Current month record")
     * )
     */
    public function current(Request $request)
    {
        $record = $request->user()
            ->financialRecords()
            ->where('year', date('Y'))
            ->where('month', date('n'))
            ->first();

        if (!$record) {
            $record = new FinancialRecord([
                'user_id' => $request->user()->id,
                'year' => date('Y'),
                'month' => date('n'),
                'monthly_income' => $request->user()->monthly_income,
                'monthly_expenses' => $request->user()->monthly_expenses,
                'savings_goal' => 0,
                'savings_goal_type' => 'fixed',
            ]);
        }

        return response()->json($record);
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/year/{year}",
     *     tags={"Financial Records"},
     *     summary="Get financial records for a year",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="year", in="path", required=true, @OA\Schema(type="integer", example=2025)),
     *     @OA\Response(response=200, description="Array of monthly records for the year")
     * )
     */
    public function byYear(Request $request, $year)
    {
        $records = $request->user()
            ->financialRecords()
            ->where('year', $year)
            ->orderBy('month', 'asc')
            ->get();

        return response()->json($records);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'year' => 'required|integer',
                'month' => 'required|integer|between:1,12',
                'monthly_income' => 'required|numeric|min:0',
                'monthly_expenses' => 'required|numeric|min:0',
                'savings_goal' => 'nullable|numeric|min:0',
                'savings_goal_type' => 'nullable|in:percentage,fixed',
            ]);

            $record = $request->user()->financialRecords()->updateOrCreate(
                [
                    'year' => $request->year,
                    'month' => $request->month,
                ],
                [
                    'monthly_income' => $request->monthly_income,
                    'monthly_expenses' => $request->monthly_expenses,
                    'savings_goal' => $request->savings_goal ?? 0,
                    'savings_goal_type' => $request->savings_goal_type ?? 'fixed',
                ]
            );

            // Also update the user's default values to the latest record
            $request->user()->update([
                'monthly_income' => $request->monthly_income,
                'monthly_expenses' => $request->monthly_expenses,
            ]);

            return response()->json($record, 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to save financial record: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        $record = $request->user()->financialRecords()->findOrFail($id);
        return response()->json($record);
    }

    public function update(Request $request, $id)
    {
        try {
            $record = $request->user()->financialRecords()->findOrFail($id);

            $request->validate([
                'monthly_income' => 'sometimes|required|numeric|min:0',
                'monthly_expenses' => 'sometimes|required|numeric|min:0',
                'savings_goal' => 'sometimes|nullable|numeric|min:0',
                'savings_goal_type' => 'sometimes|nullable|in:percentage,fixed',
            ]);

            $record->update($request->only([
                'monthly_income',
                'monthly_expenses',
                'savings_goal',
                'savings_goal_type',
            ]));

            // Update user's default values if this is the current month
            if ($record->year == date('Y') && $record->month == date('n')) {
                $request->user()->update([
                    'monthly_income' => $record->monthly_income,
                    'monthly_expenses' => $record->monthly_expenses,
                ]);
            }

            return response()->json($record);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update financial record: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $record = $request->user()->financialRecords()->findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Financial record deleted']);
    }

    public function netWorth(Request $request)
    {
        $user = $request->user();

        // Load data once to avoid N+1 queries in the history loop
        $transactions  = $user->transactions()->get(['type', 'transaction_date', 'amount']);
        $investmentRows = $user->investments()->get(['type', 'purchase_date', 'current_amount', 'initial_amount']);

        // ── Current snapshot ────────────────────────────────────────────────
        $investmentValue = (float) $investmentRows->sum('current_amount');
        $investmentCost  = (float) $investmentRows->sum('initial_amount');

        $totalIncome   = (float) $transactions->where('type', 'income')->sum('amount');
        $totalExpenses = (float) $transactions->where('type', 'expense')->sum('amount');
        $cashBalance   = round($totalIncome - $totalExpenses, 2);

        $netWorth   = round($cashBalance + $investmentValue, 2);
        $investGain = round($investmentValue - $investmentCost, 2);
        $investRoi  = $investmentCost > 0
            ? round(($investGain / $investmentCost) * 100, 2)
            : 0;

        // ── Monthly / yearly deltas ──────────────────────────────────────────
        $now           = now();
        $monthStart    = $now->copy()->startOfMonth();
        $yearStart     = $now->copy()->startOfYear();

        $incomeThisMonth  = (float) $transactions
            ->where('type', 'income')
            ->filter(fn ($t) => $t->transaction_date >= $monthStart)
            ->sum('amount');
        $expenseThisMonth = (float) $transactions
            ->where('type', 'expense')
            ->filter(fn ($t) => $t->transaction_date >= $monthStart)
            ->sum('amount');
        $monthlyChange = round($incomeThisMonth - $expenseThisMonth, 2);

        $incomeThisYear  = (float) $transactions
            ->where('type', 'income')
            ->filter(fn ($t) => $t->transaction_date >= $yearStart)
            ->sum('amount');
        $expenseThisYear = (float) $transactions
            ->where('type', 'expense')
            ->filter(fn ($t) => $t->transaction_date >= $yearStart)
            ->sum('amount');
        $yearlyChange = round($incomeThisYear - $expenseThisYear, 2);

        // ── 13-month history (current + 12 prior) ───────────────────────────
        // Each point = cumulative cash up to that month-end + investment value at time of snapshot
        $history = [];
        for ($i = 12; $i >= 0; $i--) {
            $pointEnd = $now->copy()->subMonths($i)->endOfMonth();
            $label    = $now->copy()->subMonths($i)->format('M y');

            $cumulativeIncome  = (float) $transactions
                ->where('type', 'income')
                ->filter(fn ($t) => $t->transaction_date <= $pointEnd)
                ->sum('amount');
            $cumulativeExpense = (float) $transactions
                ->where('type', 'expense')
                ->filter(fn ($t) => $t->transaction_date <= $pointEnd)
                ->sum('amount');
            $cash = round($cumulativeIncome - $cumulativeExpense, 2);

            $invAtPoint = (float) $investmentRows
                ->filter(fn ($inv) => $inv->purchase_date && $inv->purchase_date <= $pointEnd)
                ->sum('current_amount');

            $history[] = [
                'label'       => $label,
                'net_worth'   => round($cash + $invAtPoint, 2),
                'cash'        => $cash,
                'investments' => round($invAtPoint, 2),
            ];
        }

        // ── Asset allocation (by investment type) ────────────────────────────
        $allocation = $investmentRows
            ->groupBy('type')
            ->map(fn ($rows, $type) => [
                'type'  => $type,
                'value' => round((float) $rows->sum('current_amount'), 2),
            ])
            ->sortByDesc('value')
            ->values();

        // Add cash as an allocation bucket
        $allocationFull = collect([['type' => 'Cash', 'value' => max(0, $cashBalance)]])
            ->concat($allocation)
            ->values();

        return response()->json([
            'net_worth'        => $netWorth,
            'cash_balance'     => $cashBalance,
            'investment_value' => $investmentValue,
            'investment_cost'  => $investmentCost,
            'investment_gain'  => $investGain,
            'investment_roi'   => $investRoi,
            'total_income'     => round($totalIncome, 2),
            'total_expenses'   => round($totalExpenses, 2),
            'monthly_change'   => $monthlyChange,
            'yearly_change'    => $yearlyChange,
            'history'          => $history,
            'allocation'       => $allocationFull,
        ]);
    }

    public function allocation(Request $request)
    {
        $request->validate([
            'account'    => 'nullable|string|max:100',
            'date_from'  => 'nullable|date',
            'date_to'    => 'nullable|date|after_or_equal:date_from',
            'type'       => 'nullable|string|max:50',
        ]);

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
            'type'       => $row->type,
            'total'      => round((float) $row->total, 2),
            'percentage' => $total > 0 ? round(((float) $row->total / $total) * 100, 2) : 0,
            'count'      => (int) $row->count,
        ])->values();

        return response()->json([
            'total'      => round($total, 2),
            'breakdown'  => $breakdown,
            'filters'    => [
                'account'   => $request->account,
                'date_from' => $request->date_from,
                'date_to'   => $request->date_to,
                'type'      => $request->type,
            ],
        ]);
    }

    public function healthScore(Request $request, HealthScoreCalculator $calculator)
    {
        $user = $request->user();

        $result = Cache::remember(
            "health-score:{$user->id}",
            now()->addMinutes(15),
            function () use ($user, $calculator) {
                return [
                    'score'   => $calculator->calculate($user),
                    'history' => $calculator->history($user, 6),
                ];
            }
        );

        return response()->json($result);
    }
}
