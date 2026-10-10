<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\TokenService;

class CustomAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $accessToken = TokenService::find($token);

        if (!$accessToken) {
            return response()->json(['message' => 'Invalid or expired token'], 401);
        }

        $user = $accessToken->tokenable;

        if ($user->isBlacklisted()) {
            return response()->json(['message' => 'Your account has been suspended.'], 403);
        }

        $user->withAccessToken($accessToken);

        auth()->setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
