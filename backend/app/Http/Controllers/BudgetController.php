<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Budget;
use App\Models\Category;

class BudgetController extends Controller
{
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
}
