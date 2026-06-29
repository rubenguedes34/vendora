<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\FinancialRecord;
use App\Models\BudgetRange;

class SetupController extends Controller
{
    public function completeSetup(Request $request)
    {
        try {
            $user = Auth::user();
            
            if (!$user) {
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $request->validate([
                'monthly_income' => 'required|numeric|min:0',
                'monthly_expenses' => 'required|numeric|min:0',
                'budget_range_id' => 'nullable|exists:budget_ranges,id',
            ]);

            // Update user with financial data
            $user->monthly_income = $request->monthly_income;
            $user->monthly_expenses = $request->monthly_expenses;
            $user->save();

            // Create financial record for current month
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

            return response()->json([
                'message' => 'Setup completed successfully',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'monthly_income' => $user->monthly_income,
                    'monthly_expenses' => $user->monthly_expenses,
                    'current_year' => $currentYear,
                    'current_month' => $currentMonth,
                ],
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Setup failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function getBudgetRanges()
    {
        try {
            $ranges = BudgetRange::all();
            return response()->json($ranges, 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch budget ranges: ' . $e->getMessage(),
            ], 500);
        }
    }
}
