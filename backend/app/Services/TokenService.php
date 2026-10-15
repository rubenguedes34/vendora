<?php

namespace App\Services;

use App\Models\User;
use Laravel\Sanctum\PersonalAccessToken;

class TokenService
{
    /**
     * Issue a new API token for the given user.
     */
    public static function issue(User $user): string
    {
        $minutes = config('sanctum.expiration');
        $expiresAt = $minutes ? now()->addMinutes((int) $minutes) : null;

        return $user->createToken('api', ['*'], $expiresAt)->plainTextToken;
    }

    /**
     * Look up a stored token, or null when it is unknown, expired, or its
     * owner no longer exists.
     */
    public static function find(?string $token): ?PersonalAccessToken
    {
        if (! is_string($token) || $token === '') {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (! $accessToken) {
            return null;
        }

        if ($accessToken->expires_at && $accessToken->expires_at->isPast()) {
            $accessToken->delete();

            return null;
        }

        return $accessToken->tokenable instanceof User ? $accessToken : null;
    }

    /**
     * Verify a token and return the associated user, or null when it is not valid.
     */
    public static function verify(?string $token): ?User
    {
        return self::find($token)?->tokenable;
    }

    /**
     * Revoke every token of the user, optionally keeping one (the current session).
     */
    public static function revokeAll(User $user, ?PersonalAccessToken $except = null): void
    {
        $user->tokens()
            ->when($except, fn ($query) => $query->whereKeyNot($except->getKey()))
            ->delete();
    }
}
