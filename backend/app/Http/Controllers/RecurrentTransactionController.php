<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecurrentTransaction\CopyToMonthRequest;
use App\Http\Requests\RecurrentTransaction\StoreRecurrentTransactionRequest;
use App\Http\Requests\RecurrentTransaction\UpdateRecurrentTransactionRequest;
use App\Models\Category;
use App\Models\RecurrentTransaction;
use Illuminate\Http\Request;

class RecurrentTransactionController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/recurrent-transactions",
     *     tags={"Recurrent Transactions"},
     *     summary="List recurrent transactions",
     *     security={{"bearerAuth":{}}},
     *
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
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"description","amount","type","category_id","day_of_month"},
     *
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="day_of_month", type="integer", minimum=1, maximum=28)
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Created")
     * )
     */
    public function store(StoreRecurrentTransactionRequest $request)
    {
        $data = $request->validated();

        Category::assertMatchesTransactionType($data['category_id'], $data['type']);

        $item = $request->user()->recurrentTransactions()->create($data);

        return response()->json($item->load('category'), 201);
    }

    /**
     * @OA\Get(
     *     path="/api/recurrent-transactions/{recurrent_transaction}",
     *     tags={"Recurrent Transactions"},
     *     summary="Get a single recurrent transaction",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="recurrent_transaction", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Recurrent transaction object")
     * )
     */
    public function show($id)
    {
        $item = RecurrentTransaction::with('category')->findOrFail($id);
        $this->authorize('view', $item);

        return response()->json($item);
    }

    /**
     * @OA\Put(
     *     path="/api/recurrent-transactions/{recurrent_transaction}",
     *     tags={"Recurrent Transactions"},
     *     summary="Update a recurrent transaction",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="recurrent_transaction", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="day_of_month", type="integer", minimum=1, maximum=28)
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Recurrent transaction updated")
     * )
     */
    public function update(UpdateRecurrentTransactionRequest $request)
    {
        $item = $request->record();
        $data = $request->validated();

        Category::assertMatchesTransactionType(
            $data['category_id'] ?? $item->category_id,
            $data['type'] ?? $item->type
        );

        $item->update($data);

        return response()->json($item->load('category'));
    }

    /**
     * @OA\Delete(
     *     path="/api/recurrent-transactions/{recurrent_transaction}",
     *     tags={"Recurrent Transactions"},
     *     summary="Delete a recurrent transaction",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="recurrent_transaction", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Recurrent transaction deleted")
     * )
     */
    public function destroy($id)
    {
        $item = RecurrentTransaction::findOrFail($id);
        $this->authorize('delete', $item);

        $item->delete();

        return response()->json(['message' => 'Recurrent transaction deleted']);
    }

    /**
     * @OA\Post(
     *     path="/api/recurrent-transactions/copy",
     *     tags={"Recurrent Transactions"},
     *     summary="Copy all recurrent transactions to a specific month",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"month"},
     *
     *             @OA\Property(property="month", type="string", example="2025-07")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Number of transactions created")
     * )
     */
    public function copyToMonth(CopyToMonthRequest $request)
    {
        [$year, $month] = explode('-', $request->month);
        $year = (int) $year;
        $month = (int) $month;

        $recurrents = $request->user()
            ->recurrentTransactions()
            ->where('is_active', true)
            ->with('category')
            ->get();

        $created = 0;

        foreach ($recurrents as $recurrent) {
            $day = min($recurrent->day_of_month, cal_days_in_month(CAL_GREGORIAN, $month, $year));
            $date = sprintf('%04d-%02d-%02d', $year, $month, $day);

            $existing = $request->user()->transactions()
                ->where('description', $recurrent->description)
                ->where('category_id', $recurrent->category_id)
                ->where('amount', $recurrent->amount)
                ->where('type', $recurrent->type)
                ->whereDate('transaction_date', $date)
                ->first();

            if (! $existing) {
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
