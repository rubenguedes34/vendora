<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\TokenService;

class CustomAuth
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken()
            ?? $request->header('X-Auth-Token')
            ?? $request->input('token')
            ?? $request->query('token');

        if (!$token) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $user = TokenService::verify($token);

        if (!$user) {
            return response()->json(['message' => 'Invalid or expired token'], 401);
        }

        auth()->login($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
