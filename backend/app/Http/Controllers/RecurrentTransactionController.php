<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RecurrentTransaction;
use App\Models\Transaction;
use App\Models\Category;

class RecurrentTransactionController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/recurrent-transactions",
     *     tags={"Recurrent Transactions"},
     *     summary="List recurrent transactions",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Array of recurrent transactions")
     * )
     */
    public function index(Request $request)
    {
        $items = $request->user()
            ->recurrentTransactions()
            ->with('category')
            ->orderBy('day_of_month')
            ->get();

        return response()->json($items);
    }

    /**
     * @OA\Post(
     *     path="/api/recurrent-transactions",
     *     tags={"Recurrent Transactions"},
     *     summary="Create a recurrent transaction",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"description","amount","type","category_id","day_of_month"},
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="day_of_month", type="integer", minimum=1, maximum=28)
     *         )
     *     ),
     *     @OA\Response(response=201, description="Created")
     * )
     */
    public function store(Request $request)
    {
        $request->validate([
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'type' => 'required|in:income,expense',
            'category_id' => 'required|exists:categories,id',
            'day_of_month' => 'required|integer|between:1,28',
        ]);

        Category::findOrFail($request->category_id);

        $item = $request->user()->recurrentTransactions()->create($request->all());

        return response()->json($item->load('category'), 201);
    }

    /**
     * @OA\Get(
     *     path="/api/recurrent-transactions/{recurrent_transaction}",
     *     tags={"Recurrent Transactions"},
     *     summary="Get a single recurrent transaction",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="recurrent_transaction", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Recurrent transaction object")
     * )
     */
    public function show(Request $request, $id)
    {
        $item = $request->user()->recurrentTransactions()->with('category')->findOrFail($id);
        return response()->json($item);
    }

    /**
     * @OA\Put(
     *     path="/api/recurrent-transactions/{recurrent_transaction}",
     *     tags={"Recurrent Transactions"},
     *     summary="Update a recurrent transaction",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="recurrent_transaction", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="day_of_month", type="integer", minimum=1, maximum=28)
     *         )
     *     ),
     *     @OA\Response(response=200, description="Recurrent transaction updated")
     * )
     */
    public function update(Request $request, $id)
    {
        $item = $request->user()->recurrentTransactions()->findOrFail($id);

        $request->validate([
            'description' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'type' => 'sometimes|required|in:income,expense',
            'category_id' => 'sometimes|required|exists:categories,id',
            'day_of_month' => 'sometimes|required|integer|between:1,28',
        ]);

        if ($request->has('category_id')) {
            Category::findOrFail($request->category_id);
        }

        $item->update($request->all());

        return response()->json($item->load('category'));
    }

    /**
     * @OA\Delete(
     *     path="/api/recurrent-transactions/{recurrent_transaction}",
     *     tags={"Recurrent Transactions"},
     *     summary="Delete a recurrent transaction",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="recurrent_transaction", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Recurrent transaction deleted")
     * )
     */
    public function destroy(Request $request, $id)
    {
        $item = $request->user()->recurrentTransactions()->findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Recurrent transaction deleted']);
    }

    /**
     * @OA\Post(
     *     path="/api/recurrent-transactions/copy",
     *     tags={"Recurrent Transactions"},
     *     summary="Copy all recurrent transactions to a specific month",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"month"},
     *             @OA\Property(property="month", type="string", example="2025-07")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Number of transactions created")
     * )
     */
    public function copyToMonth(Request $request)
    {
        $request->validate([
            'month' => 'required|date_format:Y-m',
        ]);

        [$year, $month] = explode('-', $request->month);
        $year = (int) $year;
        $month = (int) $month;

        $recurrents = $request->user()
            ->recurrentTransactions()
            ->with('category')
            ->get();

        $created = 0;

        foreach ($recurrents as $recurrent) {
            $day = min($recurrent->day_of_month, cal_days_in_month(CAL_GREGORIAN, $month, $year));
            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);

            $existing = $request->user()->transactions()
                ->where('description', $recurrent->description)
                ->whereDate('transaction_date', $date)
                ->first();

            if (!$existing) {
                $request->user()->transactions()->create([
                    'category_id' => $recurrent->category_id,
                    'description' => $recurrent->description,
                    'amount' => $recurrent->amount,
                    'type' => $recurrent->type,
                    'transaction_date' => $date,
                ]);
                $created++;
            }
        }

        return response()->json(['created' => $created, 'month' => $request->month]);
    }
}
