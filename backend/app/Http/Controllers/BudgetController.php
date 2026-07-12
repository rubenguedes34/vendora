<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Budget;
use App\Models\Category;

class BudgetController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/budgets",
     *     tags={"Budgets"},
     *     summary="List budgets for a month",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string", example="2025-07")),
     *     @OA\Response(response=200, description="Array of budgets")
     * )
     */
    public function index(Request $request)
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
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"category_id","amount","month"},
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="month", type="string", example="2025-07")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Budget created")
     * )
     */
    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'amount' => 'required|numeric|min:0',
            'month' => 'required|date_format:Y-m',
        ]);

        // Verify category belongs to user
        $category = Category::findOrFail($request->category_id);
        if ($category->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Invalid category'], 403);
        }

        $budget = $request->user()->budgets()->create($request->all());

        return response()->json($budget->load('category'), 201);
    }

    public function show(Request $request, $id)
    {
        $budget = $request->user()->budgets()->with('category')->findOrFail($id);
        return response()->json($budget);
    }

    public function update(Request $request, $id)
    {
        $budget = $request->user()->budgets()->findOrFail($id);

        $request->validate([
            'category_id' => 'sometimes|required|exists:categories,id',
            'amount' => 'sometimes|required|numeric|min:0',
            'month' => 'sometimes|required|date_format:Y-m',
        ]);

        if ($request->has('category_id')) {
            $category = Category::findOrFail($request->category_id);
            if ($category->user_id !== $request->user()->id) {
                return response()->json(['message' => 'Invalid category'], 403);
            }
        }

        $budget->update($request->all());

        return response()->json($budget->load('category'));
    }

    public function destroy(Request $request, $id)
    {
        $budget = $request->user()->budgets()->findOrFail($id);
        $budget->delete();

        return response()->json(['message' => 'Budget deleted']);
    }

    /**
     * @OA\Get(
     *     path="/api/budgets/summary/{month}",
     *     tags={"Budgets"},
     *     summary="Get budget summary for a month",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="month", in="path", required=false, @OA\Schema(type="string", example="2025-07")),
     *     @OA\Response(response=200, description="Budget summary with income/expenses/savings/balance")
     * )
     */
    public function summary(Request $request, $month = null)
    {
        $month = $month ?? date('Y-m');

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
}
