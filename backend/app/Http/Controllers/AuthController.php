<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\FinancialRecord;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:8|confirmed',
                'monthly_income' => 'required|numeric|min:0',
                'monthly_expenses' => 'required|numeric|min:0',
            ]);

            // Decode base64 encoded password
            $decodedPassword = base64_decode($request->password);
            $decodedPasswordConfirmation = base64_decode($request->password_confirmation);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($decodedPassword),
                'monthly_income' => $request->monthly_income,
                'monthly_expenses' => $request->monthly_expenses,
            ]);

            // Create financial record for current month
            $currentYear = date('Y');
            $currentMonth = date('n');
            
            FinancialRecord::create([
                'user_id' => $user->id,
                'year' => $currentYear,
                'month' => $currentMonth,
                'monthly_income' => $request->monthly_income,
                'monthly_expenses' => $request->monthly_expenses,
            ]);

            // Use simple token instead of Sanctum to avoid middleware issues
            $token = base64_encode($user->id . ':' . time() . ':' . $user->email);

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'monthly_income' => $user->monthly_income,
                    'monthly_expenses' => $user->monthly_expenses,
                    'current_year' => $currentYear,
                    'current_month' => $currentMonth,
                ],
                'token' => $token,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Registration failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $request->validate([
                'email' => 'required|string|email',
                'password' => 'required|string',
            ]);

            // Decode base64 encoded password
            $decodedPassword = base64_decode($request->password);

            if (!Auth::attempt(['email' => $request->email, 'password' => $decodedPassword])) {
                return response()->json([
                    'message' => 'Invalid credentials',
                ], 401);
            }

            $user = Auth::user();
            
            // Get or create financial record for current month
            $currentYear = date('Y');
            $currentMonth = date('n');
            
            $financialRecord = FinancialRecord::where('user_id', $user->id)
                ->where('year', $currentYear)
                ->where('month', $currentMonth)
                ->first();
            
            if (!$financialRecord) {
                // Create record for current month using user's default values
                $financialRecord = FinancialRecord::create([
                    'user_id' => $user->id,
                    'year' => $currentYear,
                    'month' => $currentMonth,
                    'monthly_income' => $user->monthly_income ?? 0,
                    'monthly_expenses' => $user->monthly_expenses ?? 0,
                ]);
            }
            
            // Use simple token instead of Sanctum to avoid middleware issues
            $token = base64_encode($user->id . ':' . time() . ':' . $user->email);

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'monthly_income' => $financialRecord->monthly_income,
                    'monthly_expenses' => $financialRecord->monthly_expenses,
                    'current_year' => $currentYear,
                    'current_month' => $currentMonth,
                ],
                'token' => $token,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Login failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function logout(Request $request)
    {
        // Simple logout - just return success
        // In production, you would invalidate the token
        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request)
    {
        // Return authenticated user
        return response()->json($request->user());
    }
}
