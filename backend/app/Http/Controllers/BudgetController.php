<?php

namespace App\Http\Controllers;

use App\Http\Requests\Budget\CopyPreviousBudgetRequest;
use App\Http\Requests\Budget\IndexBudgetRequest;
use App\Http\Requests\Budget\StoreBudgetRequest;
use App\Http\Requests\Budget\UpdateBudgetRequest;
use App\Models\Budget;
use Carbon\Carbon;
use Illuminate\Http\Request;

class BudgetController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/budgets",
     *     tags={"Budgets"},
     *     summary="List budgets for a month",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string", example="2025-07")),
     *
     *     @OA\Response(response=200, description="Array of budgets")
     * )
     */
    public function index(IndexBudgetRequest $request)
    {
        $month = $request->query('month', date('Y-m'));

        $budgets = $request->user()
            ->budgets()
            ->with('category')
            ->where('month', $month)
            ->get();

        return response()->json($budgets);
    }

    /**
     * @OA\Post(
     *     path="/api/budgets",
     *     tags={"Budgets"},
     *     summary="Create or update a budget entry",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"category_id","amount","month"},
     *
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="month", type="string", example="2025-07")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Budget created")
     * )
     */
    public function store(StoreBudgetRequest $request)
    {
        $data = $request->validated();

        // One limit per category and month: saving again updates it instead of adding a row the summary would sum twice.
        $budget = $request->user()->budgets()->updateOrCreate(
            ['category_id' => $data['category_id'], 'month' => $data['month']],
            ['amount' => $data['amount']],
        );

        return response()->json($budget->load('category'), 201);
    }

    /**
     * @OA\Get(
     *     path="/api/budgets/{budget}",
     *     tags={"Budgets"},
     *     summary="Get a single budget",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="budget", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Budget object")
     * )
     */
    public function show($id)
    {
        $budget = Budget::with('category')->findOrFail($id);
        $this->authorize('view', $budget);

        return response()->json($budget);
    }

    /**
     * @OA\Put(
     *     path="/api/budgets/{budget}",
     *     tags={"Budgets"},
     *     summary="Update a budget",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="budget", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="month", type="string", example="2025-07")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Budget updated")
     * )
     */
    public function update(UpdateBudgetRequest $request)
    {
        $budget = $request->record();
        $data = $request->validated();

        $budget->update($data);

        return response()->json($budget->load('category'));
    }

    /**
     * @OA\Delete(
     *     path="/api/budgets/{budget}",
     *     tags={"Budgets"},
     *     summary="Delete a budget",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="budget", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Budget deleted")
     * )
     */
    public function destroy($id)
    {
        $budget = Budget::findOrFail($id);
        $this->authorize('delete', $budget);

        $budget->delete();

        return response()->json(['message' => __('messages.budget_deleted')]);
    }

    /**
     * @OA\Get(
     *     path="/api/budgets/comparison/{month}",
     *     tags={"Budgets"},
     *     summary="Compare budgeted vs actual spending",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="month", in="path", required=false, @OA\Schema(type="string", example="2025-07")),
     *
     *     @OA\Response(response=200, description="Budget comparison")
     * )
     */
    public function comparison(Request $request, $month = null)
    {
        $month = $this->resolveMonth($month);
        [$year, $mon] = explode('-', $month);

        $budgets = $request->user()
            ->budgets()
            ->with('category')
            ->where('month', $month)
            ->get();

        if ($budgets->isEmpty()) {
            return response()->json([]);
        }

        // Single query: sum transactions grouped by category for the month
        $from = "{$year}-{$mon}-01";
        $to = date('Y-m-t', strtotime($from));

        $actuals = $request->user()
            ->transactions()
            ->selectRaw('category_id, SUM(amount) as total')
            ->whereBetween('transaction_date', [$from, $to])
            ->whereIn('category_id', $budgets->pluck('category_id'))
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        $result = $budgets->map(function ($budget) use ($actuals) {
            $budgeted = (float) $budget->amount;
            $spent = round((float) ($actuals[$budget->category_id] ?? 0), 2);
            $pct = $budgeted > 0 ? round(($spent / $budgeted) * 100, 1) : null;

            return [
                'category_id' => $budget->category_id,
                'category_name' => $budget->category?->name ?? 'Unknown',
                'category_color' => $budget->category?->color ?? '#94a3b8',
                'category_type' => $budget->category?->type ?? 'expense',
                'budgeted' => $budgeted,
                'actual' => $spent,
                'remaining' => round($budgeted - $spent, 2),
                'pct' => $pct,
            ];
        })->sortByDesc('actual')->values();

        return response()->json($result);
    }

    /**
     * @OA\Post(
     *     path="/api/budgets/copy-previous",
     *     tags={"Budgets"},
     *     summary="Copy last month's budget limits into a month",
     *     description="Only fills categories that have no budget (or 0) in the target month; never overwrites a limit the user already set.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=false,
     *
     *         @OA\JsonContent(@OA\Property(property="month", type="string", example="2025-07"))
     *     ),
     *
     *     @OA\Response(response=200, description="Number of budgets copied and the month they came from",
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="copied", type="integer"),
     *             @OA\Property(property="source_month", type="string", example="2025-06")
     *         )
     *     )
     * )
     */
    public function copyPrevious(CopyPreviousBudgetRequest $request)
    {
        $month = $request->validated('month') ?? date('Y-m');
        $source = Carbon::createFromFormat('!Y-m', $month)->subMonthNoOverflow()->format('Y-m');
        $user = $request->user();

        $alreadySet = $user->budgets()->where('month', $month)->where('amount', '>', 0)->pluck('category_id');

        // The same category can have several rows for a month; the newest one wins.
        $previous = $user->budgets()
            ->where('month', $source)
            ->where('amount', '>', 0)
            ->whereNotIn('category_id', $alreadySet)
            ->orderBy('id')
            ->get()
            ->keyBy('category_id');

        foreach ($previous as $budget) {
            $user->budgets()->updateOrCreate(
                ['category_id' => $budget->category_id, 'month' => $month],
                ['amount' => $budget->amount],
            );
        }

        return response()->json(['copied' => $previous->count(), 'source_month' => $source]);
    }

    /**
     * @OA\Get(
     *     path="/api/budgets/summary/{month}",
     *     tags={"Budgets"},
     *     summary="Get budget summary for a month",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="month", in="path", required=false, @OA\Schema(type="string", example="2025-07")),
     *
     *     @OA\Response(response=200, description="Budget summary with income/expenses/savings/balance")
     * )
     */
    public function summary(Request $request, $month = null)
    {
        $month = $this->resolveMonth($month);

        $budgets = $request->user()
            ->budgets()
            ->where('month', $month)
            ->with('category')
            ->get();

        $income = $budgets->where('category.type', 'income')->sum('amount');
        $expenses = $budgets->where('category.type', 'expense')->sum('amount');
        $savings = $budgets->where('category.type', 'savings')->sum('amount');

        return response()->json([
            'month' => $month,
            'income' => $income,
            'expenses' => $expenses,
            'savings' => $savings,
            'balance' => $income - $expenses - $savings,
        ]);
    }

    private function resolveMonth(?string $month): string
    {
        $month ??= date('Y-m');

        abort_unless(preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) === 1, 422, 'Month must be in Y-m format.');

        return $month;
    }
}
