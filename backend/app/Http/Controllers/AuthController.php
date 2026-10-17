<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ExchangeGoogleCodeRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\UpdateLocaleRequest;
use App\Http\Requests\Auth\UpdatePasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Models\FinancialRecord;
use App\Models\User;
use App\Services\TokenService;
use App\Support\DefaultCategories;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    private const GOOGLE_CODE_PREFIX = 'google-login-code:';

    private const ADMIN_PANEL_CODE_PREFIX = 'admin-panel-code:';

    /**
     * @OA\Post(
     *     path="/api/register",
     *     tags={"Auth"},
     *     summary="Register a new user",
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"name","email","password","password_confirmation"},
     *
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="password", type="string", minLength=8),
     *             @OA\Property(property="password_confirmation", type="string")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="User registered"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function register(RegisterRequest $request)
    {
        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
            ]);

            Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
            $user->assignRole('user');

            DefaultCategories::ensure();

            $token = TokenService::issue($user);

            $currentYear = date('Y');
            $currentMonth = date('n');

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'locale' => $user->locale,
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
        } catch (\Exception $e) {
            Log::error('Registration failed', ['exception' => $e]);

            return response()->json([
                'message' => __('messages.register_failed'),
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/login",
     *     tags={"Auth"},
     *     summary="Login",
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"email","password"},
     *
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="password", type="string")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Login successful, returns token"),
     *     @OA\Response(response=401, description="Invalid credentials")
     * )
     */
    public function login(LoginRequest $request)
    {
        try {
            if (! Auth::attempt(['email' => $request->email, 'password' => $request->password])) {
                return response()->json([
                    'message' => __('messages.invalid_credentials'),
                ], 401);
            }

            $user = Auth::user();

            if ($user->isBlacklisted()) {
                Auth::logout();

                return response()->json(['message' => __('messages.account_suspended')], 403);
            }

            $currentYear = date('Y');
            $currentMonth = date('n');

            $needsSetup = ($user->monthly_income === null || $user->monthly_expenses === null);

            $financialRecord = FinancialRecord::where('user_id', $user->id)
                ->where('year', $currentYear)
                ->where('month', $currentMonth)
                ->first();

            if (! $financialRecord && ! $needsSetup) {
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
                    'locale' => $user->locale,
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
        } catch (\Exception $e) {
            Log::error('Login failed', ['exception' => $e]);

            return response()->json([
                'message' => __('messages.login_failed'),
            ], 500);
        }
    }

    /**
     * @OA\Post(
     *     path="/api/logout",
     *     tags={"Auth"},
     *     summary="Logout",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Logged out")
     * )
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => __('messages.logged_out'),
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/user",
     *     tags={"Auth"},
     *     summary="Get authenticated user",
     *     security={{"bearerAuth":{}}},
     *
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
     *     path="/api/user/locale",
     *     tags={"Auth"},
     *     summary="Save the user's interface language",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="locale", type="string", enum={"en","pt"})
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Language saved")
     * )
     */
    public function updateLocale(UpdateLocaleRequest $request)
    {
        $request->user()->update(['locale' => $request->locale]);

        return response()->json(['locale' => $request->locale]);
    }

    /**
     * @OA\Put(
     *     path="/api/user/profile",
     *     tags={"Auth"},
     *     summary="Update user profile",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="email", type="string", format="email"),
     *             @OA\Property(property="monthly_income", type="number"),
     *             @OA\Property(property="monthly_expenses", type="number")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Profile updated")
     * )
     */
    public function updateProfile(UpdateProfileRequest $request)
    {
        $user = $request->user();

        // Changing the login email is sensitive, so it needs the current password.
        if ($request->email !== $user->email
            && ! Hash::check((string) $request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => [__('messages.email_needs_password')],
            ]);
        }

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'monthly_income' => $request->monthly_income,
            'monthly_expenses' => $request->monthly_expenses,
        ]);

        return response()->json([
            'message' => __('messages.profile_updated'),
            'user' => $user->fresh(),
        ]);
    }

    /**
     * @OA\Put(
     *     path="/api/user/password",
     *     tags={"Auth"},
     *     summary="Update user password",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"current_password","password","password_confirmation"},
     *
     *             @OA\Property(property="current_password", type="string"),
     *             @OA\Property(property="password", type="string", minLength=8),
     *             @OA\Property(property="password_confirmation", type="string")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Password updated")
     * )
     */
    public function updatePassword(UpdatePasswordRequest $request)
    {
        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => __('messages.current_password_wrong')], 422);
        }

        $user->update(['password' => Hash::make($request->password)]);

        // Sign out every other session; the current one stays valid.
        TokenService::revokeAll($user, $user->currentAccessToken());

        return response()->json(['message' => __('messages.password_updated')]);
    }

    /**
     * @OA\Post(
     *     path="/api/admin/panel-link",
     *     tags={"Admin"},
     *     summary="Get a single-use link that signs the current user into the admin panel",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Single-use admin panel URL"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function adminPanelLink(Request $request)
    {
        // The panel uses a browser session while the app uses API tokens, so
        // bridge the two with a short-lived, single-use code.
        $code = Str::random(64);
        Cache::put(self::ADMIN_PANEL_CODE_PREFIX.hash('sha256', $code), $request->user()->id, now()->addMinute());

        return response()->json([
            'url' => $request->getSchemeAndHttpHost().'/auth/admin-panel?code='.$code,
        ]);
    }

    public function enterAdminPanel(Request $request)
    {
        $code = $request->query('code');
        $userId = is_string($code) ? Cache::pull(self::ADMIN_PANEL_CODE_PREFIX.hash('sha256', $code)) : null;
        $user = $userId ? User::find($userId) : null;

        if (! $user || $user->isBlacklisted() || ! $user->can('access admin panel')) {
            return redirect()->route('filament.admin.auth.login');
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return redirect('/admin');
    }

    public function redirectToGoogle()
    {
        /** @var GoogleProvider $driver */
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
            if (! $emailVerified) {
                $frontendUrl = config('app.frontend_url');

                return redirect($frontendUrl.'/login?error='.urlencode('Your Google email address is not verified.'));
            }

            $user = User::where('email', $googleUser->email)->first();
            $isNewUser = false;

            if ($user && $user->isBlacklisted()) {
                $frontendUrl = config('app.frontend_url');

                return redirect($frontendUrl.'/login?error='.urlencode(__('messages.account_suspended')));
            }

            if (! $user) {
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
                DefaultCategories::ensure();
                $isNewUser = true;
            } else {
                if (empty($user->google_id)) {
                    $user->update(['google_id' => $googleUser->id]);
                }
            }

            // Hand the frontend a short-lived, single-use code instead of putting
            // the API token and profile in the redirect URL.
            $code = Str::random(64);
            Cache::put(self::GOOGLE_CODE_PREFIX.hash('sha256', $code), [
                'user_id' => $user->id,
                'is_new_user' => $isNewUser,
            ], now()->addMinute());

            $frontendUrl = config('app.frontend_url');

            return redirect($frontendUrl.'/auth/callback?code='.urlencode($code));
        } catch (\Exception $e) {
            Log::error('Google login failed', ['exception' => $e]);
            $frontendUrl = config('app.frontend_url');

            return redirect($frontendUrl.'/login?error='.urlencode('Google login failed. Please try again.'));
        }
    }

    /**
     * @OA\Post(
     *     path="/api/auth/google/exchange",
     *     tags={"Auth"},
     *     summary="Exchange a one-time Google login code for an API token",
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"code"},
     *
     *             @OA\Property(property="code", type="string")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Login successful, returns token"),
     *     @OA\Response(response=401, description="Invalid or expired code")
     * )
     */
    public function exchangeGoogleCode(ExchangeGoogleCodeRequest $request)
    {
        $payload = Cache::pull(self::GOOGLE_CODE_PREFIX.hash('sha256', $request->code));
        $user = $payload ? User::find($payload['user_id']) : null;

        if (! $user || $user->isBlacklisted()) {
            return response()->json(['message' => __('messages.login_code_invalid')], 401);
        }

        $currentYear = date('Y');
        $currentMonth = date('n');

        $needsSetup = $payload['is_new_user'] || ($user->monthly_income === null || $user->monthly_expenses === null);

        $financialRecord = FinancialRecord::where('user_id', $user->id)
            ->where('year', $currentYear)
            ->where('month', $currentMonth)
            ->first();

        // Only create a record once the user has completed setup, so we
        // never persist placeholder zero values for incomplete accounts.
        if (! $financialRecord && ! $needsSetup) {
            $financialRecord = FinancialRecord::create([
                'user_id' => $user->id,
                'year' => $currentYear,
                'month' => $currentMonth,
                'monthly_income' => $user->monthly_income,
                'monthly_expenses' => $user->monthly_expenses,
            ]);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'locale' => $user->locale,
                'roles' => $user->getRoleNames()->values(),
                'blacklisted_at' => $user->blacklisted_at,
                'monthly_income' => $financialRecord?->monthly_income ?? null,
                'monthly_expenses' => $financialRecord?->monthly_expenses ?? null,
                'current_year' => $currentYear,
                'current_month' => $currentMonth,
                'needs_setup' => $needsSetup,
            ],
            'token' => TokenService::issue($user),
        ]);
    }
}
