<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\User;

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

        $decoded = base64_decode($token);
        $parts = explode(':', $decoded);

        if (count($parts) !== 3) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        $user = User::find($parts[0]);

        if (!$user || $user->email !== $parts[2]) {
            return response()->json(['message' => 'Invalid token'], 401);
        }

        auth()->login($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
