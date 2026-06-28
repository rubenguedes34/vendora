<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
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
            ]);

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);

            // Use simple token instead of Sanctum to avoid middleware issues
            $token = base64_encode($user->id . ':' . time() . ':' . $user->email);

            $currentYear = date('Y');
            $currentMonth = date('n');

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'monthly_income' => null,
                    'monthly_expenses' => null,
                    'current_year' => $currentYear,
                    'current_month' => $currentMonth,
                    'needs_setup' => true,
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

            if (!Auth::attempt(['email' => $request->email, 'password' => $request->password])) {
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

            $needsSetup = ($user->monthly_income === null || $user->monthly_expenses === null);

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'monthly_income' => $financialRecord->monthly_income,
                    'monthly_expenses' => $financialRecord->monthly_expenses,
                    'current_year' => $currentYear,
                    'current_month' => $currentMonth,
                    'needs_setup' => $needsSetup,
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

    public function redirectToGoogle()
    {
        return Socialite::driver('google')
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            $user = User::where('email', $googleUser->email)->first();
            $isNewUser = false;

            if (!$user) {
                $user = User::create([
                    'name' => $googleUser->name ?? $googleUser->email,
                    'email' => $googleUser->email,
                    'google_id' => $googleUser->id,
                    'password' => Hash::make(Str::random(32)),
                    'email_verified_at' => now(),
                ]);
                $isNewUser = true;
            } else {
                if (empty($user->google_id)) {
                    $user->update(['google_id' => $googleUser->id]);
                }
            }

            // Create financial record for current month if missing
            $currentYear = date('Y');
            $currentMonth = date('n');

            $financialRecord = FinancialRecord::where('user_id', $user->id)
                ->where('year', $currentYear)
                ->where('month', $currentMonth)
                ->first();

            if (!$financialRecord) {
                $financialRecord = FinancialRecord::create([
                    'user_id' => $user->id,
                    'year' => $currentYear,
                    'month' => $currentMonth,
                    'monthly_income' => $user->monthly_income ?? 0,
                    'monthly_expenses' => $user->monthly_expenses ?? 0,
                ]);
            }

            // Generate simple token
            $token = base64_encode($user->id . ':' . time() . ':' . $user->email);

            $userData = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'monthly_income' => $financialRecord->monthly_income,
                'monthly_expenses' => $financialRecord->monthly_expenses,
                'current_year' => $currentYear,
                'current_month' => $currentMonth,
            ];

            $userData['needs_setup'] = $isNewUser || ($user->monthly_income === null || $user->monthly_expenses === null);

            $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');
            return redirect($frontendUrl . '/auth/callback?token=' . urlencode($token) . '&user=' . urlencode(json_encode($userData)));
        } catch (\Exception $e) {
            $frontendUrl = env('FRONTEND_URL', 'http://localhost:4200');
            return redirect($frontendUrl . '/login?error=' . urlencode('Google login failed: ' . $e->getMessage()));
        }
    }
}
