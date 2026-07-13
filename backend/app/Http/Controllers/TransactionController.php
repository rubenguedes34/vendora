<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Category;
use App\Models\User;

class TransactionController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/transactions",
     *     tags={"Transactions"},
     *     summary="List all transactions",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Array of transactions")
     * )
     */
    public function index(Request $request)
    {
        $request->validate([
            'search'      => 'nullable|string|max:100',
            'type'        => 'nullable|in:income,expense',
            'category_id' => 'nullable|integer|exists:categories,id',
            'date_from'   => 'nullable|date',
            'date_to'     => 'nullable|date|after_or_equal:date_from',
        ]);

        $query = $request->user()
            ->transactions()
            ->with('category')
            ->orderBy('transaction_date', 'desc');

        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        return response()->json($query->get());
    }

    /**
     * @OA\Post(
     *     path="/api/transactions",
     *     tags={"Transactions"},
     *     summary="Create a transaction",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"category_id","description","amount","type","transaction_date"},
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="transaction_date", type="string", format="date")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Transaction created")
     * )
     */
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

    public function export(Request $request)
    {
        $request->validate([
            'search'      => 'nullable|string|max:100',
            'type'        => 'nullable|in:income,expense',
            'category_id' => 'nullable|integer|exists:categories,id',
            'date_from'   => 'nullable|date',
            'date_to'     => 'nullable|date|after_or_equal:date_from',
        ]);

        $query = $request->user()
            ->transactions()
            ->with('category')
            ->orderBy('transaction_date', 'desc');

        if ($request->filled('search'))      $query->where('description', 'like', '%' . $request->search . '%');
        if ($request->filled('type'))        $query->where('type', $request->type);
        if ($request->filled('category_id')) $query->where('category_id', $request->category_id);
        if ($request->filled('date_from'))   $query->whereDate('transaction_date', '>=', $request->date_from);
        if ($request->filled('date_to'))     $query->whereDate('transaction_date', '<=', $request->date_to);

        $transactions = $query->get();

        $lines = ["Date,Description,Category,Type,Amount"];
        foreach ($transactions as $t) {
            $lines[] = implode(',', [
                $t->transaction_date,
                '"' . str_replace('"', '""', $t->description) . '"',
                '"' . str_replace('"', '""', $t->category?->name ?? '') . '"',
                $t->type,
                $t->amount,
            ]);
        }

        $csv = implode("\n", $lines);
        $filename = 'transactions-' . date('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function expensesByCategory(Request $request)
    {
        $request->validate(['month' => ['nullable', 'regex:/^\d{4}-\d{2}$/']]);

        $month = $request->query('month', date('Y-m'));

        [$year, $mon] = explode('-', $month);

        /** @var User $user */
        $user = $request->user();
        $results = $user
            ->transactions()
            ->with('category')
            ->where('type', 'expense')
            ->whereYear('transaction_date', (int) $year)
            ->whereMonth('transaction_date', (int) $mon)
            ->get()
            ->groupBy(fn ($t) => $t->category?->name ?? 'Uncategorised')
            ->map(fn ($group, $name) => [
                'category' => $name,
                'color'    => $group->first()->category?->color ?? '#94a3b8',
                'total'    => round($group->sum('amount'), 2),
            ])
            ->values()
            ->sortByDesc('total')
            ->values();

        return response()->json($results);
    }
}
