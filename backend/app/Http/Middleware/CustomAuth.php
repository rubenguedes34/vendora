<?php

namespace App\Http\Middleware;

use App\Services\TokenService;
use Closure;
use Illuminate\Http\Request;

class CustomAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (! $token) {
            return response()->json(['message' => __('messages.unauthorized')], 401);
        }

        $accessToken = TokenService::find($token);

        if (! $accessToken) {
            return response()->json(['message' => __('messages.token_expired')], 401);
        }

        $user = $accessToken->tokenable;

        if ($user->isBlacklisted()) {
            return response()->json(['message' => __('messages.account_suspended')], 403);
        }

        $user->withAccessToken($accessToken);

        auth()->setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
