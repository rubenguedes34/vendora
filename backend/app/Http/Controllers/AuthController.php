<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use App\Models\User;
use App\Models\FinancialRecord;
use App\Services\TokenService;

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

            $token = TokenService::issue($user);

            $currentYear = date('Y');
            $currentMonth = date('n');

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'monthly_income' => null,
                    'monthly_expenses' => null,
                    'savings_goal' => null,
                    'savings_goal_type' => null,
                    'current_year' => $currentYear,
                    'current_month' => $currentMonth,
                    'needs_setup' => true,
                ],
                'token' => $token,
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Registration failed', ['exception' => $e]);
            return response()->json([
                'message' => 'Registration failed. Please try again.',
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

            $currentYear = date('Y');
            $currentMonth = date('n');

            $needsSetup = ($user->monthly_income === null || $user->monthly_expenses === null);

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
                    'monthly_income' => $user->monthly_income,
                    'monthly_expenses' => $user->monthly_expenses,
                ]);
            }

            $token = TokenService::issue($user);

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'monthly_income' => $financialRecord?->monthly_income ?? null,
                    'monthly_expenses' => $financialRecord?->monthly_expenses ?? null,
                    'current_year' => $currentYear,
                    'current_month' => $currentMonth,
                    'needs_setup' => $needsSetup,
                ],
                'token' => $token,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            Log::error('Login failed', ['exception' => $e]);
            return response()->json([
                'message' => 'Login failed. Please try again.',
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
        /** @var \Laravel\Socialite\Two\GoogleProvider $driver */
        $driver = Socialite::driver('google');

        return $driver
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    public function handleGoogleCallback()
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            // Only trust a Google identity whose email Google has verified, so a
            // user cannot be linked to (or created from) an unverified address.
            $emailVerified = $googleUser->user['email_verified'] ?? false;
            if (!$emailVerified) {
                $frontendUrl = config('app.frontend_url');
                return redirect($frontendUrl . '/login?error=' . urlencode('Your Google email address is not verified.'));
            }

            $user = User::where('email', $googleUser->email)->first();
            $isNewUser = false;

            if (!$user) {
                $user = User::create([
                    'name' => $googleUser->name ?? $googleUser->email,
                    'email' => $googleUser->email,
                    'google_id' => $googleUser->id,
                    'password' => Hash::make(Str::random(32)),
                ]);
                // email_verified_at is not mass assignable, so set it directly.
                $user->forceFill(['email_verified_at' => now()])->save();
                $isNewUser = true;
            } else {
                if (empty($user->google_id)) {
                    $user->update(['google_id' => $googleUser->id]);
                }
            }

            $currentYear = date('Y');
            $currentMonth = date('n');

            $needsSetup = $isNewUser || ($user->monthly_income === null || $user->monthly_expenses === null);

            $financialRecord = FinancialRecord::where('user_id', $user->id)
                ->where('year', $currentYear)
                ->where('month', $currentMonth)
                ->first();

            // Only create a record once the user has completed setup, so we
            // never persist placeholder zero values for incomplete accounts.
            if (!$financialRecord && !$needsSetup) {
                $financialRecord = FinancialRecord::create([
                    'user_id' => $user->id,
                    'year' => $currentYear,
                    'month' => $currentMonth,
                    'monthly_income' => $user->monthly_income,
                    'monthly_expenses' => $user->monthly_expenses,
                ]);
            }

            $token = TokenService::issue($user);

            $userData = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'monthly_income' => $financialRecord?->monthly_income ?? null,
                'monthly_expenses' => $financialRecord?->monthly_expenses ?? null,
                'current_year' => $currentYear,
                'current_month' => $currentMonth,
                'needs_setup' => $needsSetup,
            ];

            $frontendUrl = config('app.frontend_url');
            return redirect($frontendUrl . '/auth/callback?token=' . urlencode($token) . '&user=' . urlencode(json_encode($userData)));
        } catch (\Exception $e) {
            Log::error('Google login failed', ['exception' => $e]);
            $frontendUrl = config('app.frontend_url');
            return redirect($frontendUrl . '/login?error=' . urlencode('Google login failed. Please try again.'));
        }
    }
}
