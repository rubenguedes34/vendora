<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
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

        // ── Current snapshot ────────────────────────────────────────────────
        $investmentValue = (float) $user->investments()->sum('current_amount');
        $investmentCost  = (float) $user->investments()->sum('initial_amount');

        $totalIncome   = (float) $user->transactions()->where('type', 'income')->sum('amount');
        $totalExpenses = (float) $user->transactions()->where('type', 'expense')->sum('amount');
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
        $prevMonthStart = $now->copy()->subMonth()->startOfMonth();
        $prevMonthEnd   = $now->copy()->subMonth()->endOfMonth();

        $incomeThisMonth  = (float) $user->transactions()->where('type','income') ->whereDate('transaction_date','>=',$monthStart)->sum('amount');
        $expenseThisMonth = (float) $user->transactions()->where('type','expense')->whereDate('transaction_date','>=',$monthStart)->sum('amount');
        $monthlyChange    = round($incomeThisMonth - $expenseThisMonth, 2);

        $incomeThisYear  = (float) $user->transactions()->where('type','income') ->whereDate('transaction_date','>=',$yearStart)->sum('amount');
        $expenseThisYear = (float) $user->transactions()->where('type','expense')->whereDate('transaction_date','>=',$yearStart)->sum('amount');
        $yearlyChange    = round($incomeThisYear - $expenseThisYear, 2);

        // ── 13-month history (current + 12 prior) ───────────────────────────
        // Each point = cumulative cash up to that month-end + investment value at time of snapshot
        // We approximate investment value as constant (current) since we don't store history.
        $history = [];
        for ($i = 12; $i >= 0; $i--) {
            $pointEnd = $now->copy()->subMonths($i)->endOfMonth();
            $label    = $now->copy()->subMonths($i)->format('M y');

            $cumulativeIncome  = (float) $user->transactions()
                ->where('type', 'income')
                ->whereDate('transaction_date', '<=', $pointEnd)
                ->sum('amount');
            $cumulativeExpense = (float) $user->transactions()
                ->where('type', 'expense')
                ->whereDate('transaction_date', '<=', $pointEnd)
                ->sum('amount');
            $cash = round($cumulativeIncome - $cumulativeExpense, 2);

            // For past months use the ratio of investments that existed then
            $invAtPoint = (float) $user->investments()
                ->whereDate('purchase_date', '<=', $pointEnd)
                ->sum('current_amount');

            $history[] = [
                'label'     => $label,
                'net_worth' => round($cash + $invAtPoint, 2),
                'cash'      => $cash,
                'investments' => round($invAtPoint, 2),
            ];
        }

        // ── Asset allocation (by investment type) ────────────────────────────
        $allocation = $user->investments()
            ->selectRaw('type, SUM(current_amount) as total')
            ->groupBy('type')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'type'  => $row->type,
                'value' => round((float) $row->total, 2),
            ])
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

        return response()->json([
            'score'      => $calculator->calculate($user),
            'history'    => $calculator->history($user, 6),
        ]);
    }
}
