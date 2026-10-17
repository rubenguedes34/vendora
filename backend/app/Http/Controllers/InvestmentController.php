<?php

namespace App\Http\Controllers;

use App\Http\Requests\Investment\StoreInvestmentRequest;
use App\Http\Requests\Investment\UpdateInvestmentRequest;
use App\Models\Investment;
use Illuminate\Http\Request;

class InvestmentController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/investments",
     *     tags={"Investments"},
     *     summary="List all investments",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Array of investments")
     * )
     */
    public function index(Request $request)
    {
        $investments = $request->user()
            ->investments()
            ->orderBy('purchase_date', 'desc')
            ->get();

        return response()->json($investments);
    }

    /**
     * @OA\Post(
     *     path="/api/investments",
     *     tags={"Investments"},
     *     summary="Create an investment",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"name","type","initial_amount","current_amount","purchase_date"},
     *
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="type", type="string"),
     *             @OA\Property(property="account", type="string"),
     *             @OA\Property(property="initial_amount", type="number"),
     *             @OA\Property(property="current_amount", type="number"),
     *             @OA\Property(property="purchase_date", type="string", format="date")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Investment created")
     * )
     */
    public function store(StoreInvestmentRequest $request)
    {
        $data = $request->validated();

        $investment = $request->user()->investments()->create($data);

        return response()->json($investment, 201);
    }

    /**
     * @OA\Get(
     *     path="/api/investments/{investment}",
     *     tags={"Investments"},
     *     summary="Get a single investment",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="investment", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Investment object")
     * )
     */
    public function show($id)
    {
        $investment = Investment::findOrFail($id);
        $this->authorize('view', $investment);

        return response()->json($investment);
    }

    /**
     * @OA\Put(
     *     path="/api/investments/{investment}",
     *     tags={"Investments"},
     *     summary="Update an investment",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="investment", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="type", type="string"),
     *             @OA\Property(property="account", type="string"),
     *             @OA\Property(property="initial_amount", type="number"),
     *             @OA\Property(property="current_amount", type="number"),
     *             @OA\Property(property="purchase_date", type="string", format="date")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Investment updated")
     * )
     */
    public function update(UpdateInvestmentRequest $request)
    {
        $investment = $request->record();
        $data = $request->validated();

        $investment->update($data);

        return response()->json($investment);
    }

    /**
     * @OA\Delete(
     *     path="/api/investments/{investment}",
     *     tags={"Investments"},
     *     summary="Delete an investment",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="investment", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Investment deleted")
     * )
     */
    public function destroy($id)
    {
        $investment = Investment::findOrFail($id);
        $this->authorize('delete', $investment);

        $investment->delete();

        return response()->json(['message' => __('messages.investment_deleted')]);
    }
}
