<?php

namespace App\Http\Middleware;

use App\Services\TokenService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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
            Log::channel('auth')->warning('Invalid or expired token', ['ip' => $request->ip(), 'path' => $request->path()]);

            return response()->json(['message' => __('messages.token_expired')], 401);
        }

        $user = $accessToken->tokenable;

        if ($user->isBlacklisted()) {
            Log::channel('auth')->warning('Blacklisted account blocked', ['user_id' => $user->id, 'ip' => $request->ip()]);

            return response()->json(['message' => __('messages.account_suspended')], 403);
        }

        // Feeds the admin "active users" stat; hourly granularity avoids a write per request.
        if (! $accessToken->last_used_at || $accessToken->last_used_at->lt(now()->subHour())) {
            $accessToken->forceFill(['last_used_at' => now()])->save();
        }

        $user->withAccessToken($accessToken);

        auth()->setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
