<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Log;
use App\Http\Requests\Setup\StoreSetupRequest;
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
    public function store(StoreSetupRequest $request)
    {
        try {
            $user = TokenService::verify($request->token);

            if (!$user) {
                return response()->json(['message' => 'Invalid token'], 401);
            }

            // Same gate as the auth.custom middleware: this route is public and reads the token itself.
            if ($user->isBlacklisted()) {
                return response()->json(['message' => 'Your account has been suspended.'], 403);
            }

            $user->update([
                'monthly_income' => $request->monthly_income,
                'monthly_expenses' => $request->monthly_expenses,
            ]);

            $currentYear = date('Y');
            $currentMonth = date('n');

            // Months follow the default just saved, so this only makes sure the current one exists.
            FinancialRecord::ensureMonth($user, (int) $currentYear, (int) $currentMonth);

            $userData = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'monthly_income' => $user->monthly_income,
                'monthly_expenses' => $user->monthly_expenses,
                'current_year' => $currentYear,
                'current_month' => $currentMonth,
                'needs_setup' => false,
            ];

            return response()->json([
                'message' => 'Setup completed successfully',
                'user' => $userData,
            ]);
        } catch (\Exception $e) {
            Log::error('Setup failed', ['exception' => $e]);
            return response()->json([
                'message' => 'Setup failed. Please try again.',
            ], 500);
        }
    }
}
