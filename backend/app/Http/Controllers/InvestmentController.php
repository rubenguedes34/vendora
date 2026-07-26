<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Investment;

class InvestmentController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/investments",
     *     tags={"Investments"},
     *     summary="List all investments",
     *     security={{"bearerAuth":{}}},
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
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"name","type","initial_amount","current_amount","purchase_date"},
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="type", type="string"),
     *             @OA\Property(property="account", type="string"),
     *             @OA\Property(property="initial_amount", type="number"),
     *             @OA\Property(property="current_amount", type="number"),
     *             @OA\Property(property="purchase_date", type="string", format="date")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Investment created")
     * )
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'account' => 'nullable|string|max:100',
            'initial_amount' => 'required|numeric|min:0',
            'current_amount' => 'required|numeric|min:0',
            'purchase_date' => 'required|date',
        ]);

        $investment = $request->user()->investments()->create($request->all());

        return response()->json($investment, 201);
    }

    /**
     * @OA\Get(
     *     path="/api/investments/{investment}",
     *     tags={"Investments"},
     *     summary="Get a single investment",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="investment", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Investment object")
     * )
     */
    public function show(Request $request, $id)
    {
        $investment = $request->user()->investments()->findOrFail($id);
        return response()->json($investment);
    }

    /**
     * @OA\Put(
     *     path="/api/investments/{investment}",
     *     tags={"Investments"},
     *     summary="Update an investment",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="investment", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="type", type="string"),
     *             @OA\Property(property="account", type="string"),
     *             @OA\Property(property="initial_amount", type="number"),
     *             @OA\Property(property="current_amount", type="number"),
     *             @OA\Property(property="purchase_date", type="string", format="date")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Investment updated")
     * )
     */
    public function update(Request $request, $id)
    {
        $investment = $request->user()->investments()->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:50',
            'account' => 'nullable|string|max:100',
            'initial_amount' => 'sometimes|required|numeric|min:0',
            'current_amount' => 'sometimes|required|numeric|min:0',
            'purchase_date' => 'sometimes|required|date',
        ]);

        $investment->update($request->all());

        return response()->json($investment);
    }

    /**
     * @OA\Delete(
     *     path="/api/investments/{investment}",
     *     tags={"Investments"},
     *     summary="Delete an investment",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="investment", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Investment deleted")
     * )
     */
    public function destroy(Request $request, $id)
    {
        $investment = $request->user()->investments()->findOrFail($id);
        $investment->delete();

        return response()->json(['message' => 'Investment deleted']);
    }
}
