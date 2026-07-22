<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Spatie\Permission\Models\Role;
use App\Models\User;
use App\Models\Category;
use App\Models\FinancialRecord;
use App\Services\TokenService;

class AuthController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/register",
     *     tags={"Auth"},
     *     summary="Register a new user",
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"name","email","password","password_confirmation"},
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="password", type="string", minLength=8),
     *             @OA\Property(property="password_confirmation", type="string")
     *         )
     *     ),
     *     @OA\Response(response=201, description="User registered"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
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

            Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
            $user->assignRole('user');

            $this->seedDefaultCategories($user);

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

    /**
     * @OA\Post(
     *     path="/api/login",
     *     tags={"Auth"},
     *     summary="Login",
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"email","password"},
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="password", type="string")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Login successful, returns token"),
     *     @OA\Response(response=401, description="Invalid credentials")
     * )
     */
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

            if ($user->isBlacklisted()) {
                Auth::logout();
                return response()->json(['message' => 'Your account has been suspended.'], 403);
            }

            $currentYear = date('Y');
            $currentMonth = date('n');

            $needsSetup = ($user->monthly_income === null || $user->monthly_expenses === null);

            $financialRecord = FinancialRecord::where('user_id', $user->id)
                ->where('year', $currentYear)
                ->where('month', $currentMonth)
                ->first();

            if (!$financialRecord && !$needsSetup) {
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
                    'roles' => $user->getRoleNames()->values(),
                    'blacklisted_at' => $user->blacklisted_at,
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

    /**
     * @OA\Post(
     *     path="/api/logout",
     *     tags={"Auth"},
     *     summary="Logout",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Logged out")
     * )
     */
    public function logout(Request $request)
    {
        // Simple logout - just return success
        // In production, you would invalidate the token
        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/user",
     *     tags={"Auth"},
     *     summary="Get authenticated user",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="User object")
     * )
     */
    public function user(Request $request)
    {
        // Return authenticated user
        return response()->json($request->user());
    }

    /**
     * @OA\Put(
     *     path="/api/user/profile",
     *     tags={"Auth"},
     *     summary="Update user profile",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="monthly_income", type="number"),
     *             @OA\Property(property="monthly_expenses", type="number")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Profile updated")
     * )
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name'             => 'required|string|max:255',
            'email'            => 'required|email|max:255|unique:users,email,' . $user->id,
            'monthly_income'   => 'nullable|numeric|min:0',
            'monthly_expenses' => 'nullable|numeric|min:0',
        ]);

        $user->update([
            'name'             => $request->name,
            'email'            => $request->email,
            'monthly_income'   => $request->monthly_income,
            'monthly_expenses' => $request->monthly_expenses,
        ]);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $user->fresh(),
        ]);
    }

    /**
     * @OA\Put(
     *     path="/api/user/password",
     *     tags={"Auth"},
     *     summary="Update user password",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"current_password","password","password_confirmation"},
     *             @OA\Property(property="current_password", type="string"),
     *             @OA\Property(property="password", type="string", minLength=8),
     *             @OA\Property(property="password_confirmation", type="string")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Password updated")
     * )
     */
    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password'  => 'required|string',
            'password'          => 'required|string|min:8|confirmed',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['message' => 'Password updated successfully.']);
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

            if ($user && $user->isBlacklisted()) {
                $frontendUrl = config('app.frontend_url');
                return redirect($frontendUrl . '/login?error=' . urlencode('Your account has been suspended.'));
            }

            if (!$user) {
                $user = User::create([
                    'name' => $googleUser->name ?? $googleUser->email,
                    'email' => $googleUser->email,
                    'google_id' => $googleUser->id,
                    'password' => Hash::make(Str::random(32)),
                ]);
                // email_verified_at is not mass assignable, so set it directly.
                $user->forceFill(['email_verified_at' => now()])->save();
                Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
                $user->assignRole('user');
                $this->seedDefaultCategories($user);
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
                'roles' => $user->getRoleNames()->values(),
                'blacklisted_at' => $user->blacklisted_at,
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

    private function seedDefaultCategories(User $user): void
    {
        $defaults = [
            ['name' => 'Salary',         'type' => 'income',  'icon' => '💰', 'color' => '#10B981'],
            ['name' => 'Freelance',      'type' => 'income',  'icon' => '💼', 'color' => '#3B82F6'],
            ['name' => 'Side Income',    'type' => 'income',  'icon' => '📈', 'color' => '#F59E0B'],
            ['name' => 'Food',           'type' => 'expense', 'icon' => '🍔', 'color' => '#EF4444'],
            ['name' => 'Transport',      'type' => 'expense', 'icon' => '🚗', 'color' => '#3B82F6'],
            ['name' => 'Rent',           'type' => 'expense', 'icon' => '🏠', 'color' => '#8B5CF6'],
            ['name' => 'Entertainment',  'type' => 'expense', 'icon' => '🎬', 'color' => '#EC4899'],
            ['name' => 'Shopping',       'type' => 'expense', 'icon' => '🛍️', 'color' => '#F59E0B'],
            ['name' => 'Bills',          'type' => 'expense', 'icon' => '📄', 'color' => '#6366F1'],
            ['name' => 'Health',         'type' => 'expense', 'icon' => '🏥', 'color' => '#14B8A6'],
            ['name' => 'Emergency Fund', 'type' => 'savings', 'icon' => '🛡️', 'color' => '#10B981'],
            ['name' => 'Vacation',       'type' => 'savings', 'icon' => '✈️', 'color' => '#3B82F6'],
            ['name' => 'General Savings','type' => 'savings', 'icon' => '🏦', 'color' => '#8B5CF6'],
        ];

        foreach ($defaults as $cat) {
            $user->categories()->firstOrCreate(
                ['name' => $cat['name'], 'type' => $cat['type']],
                ['icon' => $cat['icon'], 'color' => $cat['color']]
            );
        }
    }
}
