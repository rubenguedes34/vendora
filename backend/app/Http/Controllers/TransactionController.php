<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Category;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $transactions = $request->user()
            ->transactions()
            ->with('category')
            ->orderBy('transaction_date', 'desc')
            ->get();

        return response()->json($transactions);
    }

    public function store(Request $request)
    {
        $request->validate([
            'category_id' => 'required|exists:categories,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'type' => 'required|in:income,expense',
            'transaction_date' => 'required|date',
        ]);

        // Verify category belongs to user
        $category = Category::findOrFail($request->category_id);
        if ($category->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Invalid category'], 403);
        }

        $transaction = $request->user()->transactions()->create([
            'category_id' => $request->category_id,
            'description' => $request->description,
            'amount' => $request->amount,
            'type' => $request->type,
            'transaction_date' => $request->transaction_date,
        ]);

        return response()->json($transaction->load('category'), 201);
    }

    public function show(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->with('category')->findOrFail($id);
        return response()->json($transaction);
    }

    public function update(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);

        $request->validate([
            'category_id' => 'sometimes|required|exists:categories,id',
            'description' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'type' => 'sometimes|required|in:income,expense',
            'transaction_date' => 'sometimes|required|date',
        ]);

        if ($request->has('category_id')) {
            $category = Category::findOrFail($request->category_id);
            if ($category->user_id !== $request->user()->id) {
                return response()->json(['message' => 'Invalid category'], 403);
            }
        }

        $transaction->update($request->all());

        return response()->json($transaction->load('category'));
    }

    public function destroy(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);
        $transaction->delete();

        return response()->json(['message' => 'Transaction deleted']);
    }
}
