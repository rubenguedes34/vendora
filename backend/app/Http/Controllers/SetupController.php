<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Models\FinancialRecord;
use App\Services\TokenService;

class SetupController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/setup",
     *     tags={"Setup"},
     *     summary="Complete initial financial setup",
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"token","monthly_income","monthly_expenses"},
     *             @OA\Property(property="token", type="string"),
     *             @OA\Property(property="monthly_income", type="number"),
     *             @OA\Property(property="monthly_expenses", type="number")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Setup completed"),
     *     @OA\Response(response=401, description="Invalid token")
     * )
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'token' => 'required|string',
                'monthly_income' => 'required|numeric|min:0',
                'monthly_expenses' => 'required|numeric|min:0',
            ]);

            $user = TokenService::verify($request->token);

            if (!$user) {
                return response()->json(['message' => 'Invalid token'], 401);
            }

            $user->update([
                'monthly_income' => $request->monthly_income,
                'monthly_expenses' => $request->monthly_expenses,
            ]);

            $currentYear = date('Y');
            $currentMonth = date('n');

            FinancialRecord::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'year' => $currentYear,
                    'month' => $currentMonth,
                ],
                [
                    'monthly_income' => $request->monthly_income,
                    'monthly_expenses' => $request->monthly_expenses,
                ]
            );

            $userData = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'monthly_income' => $request->monthly_income,
                'monthly_expenses' => $request->monthly_expenses,
                'current_year' => $currentYear,
                'current_month' => $currentMonth,
            ];

            return response()->json([
                'message' => 'Setup completed successfully',
                'user' => $userData,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Setup failed', ['exception' => $e]);
            return response()->json([
                'message' => 'Setup failed. Please try again.',
            ], 500);
        }
    }
}
