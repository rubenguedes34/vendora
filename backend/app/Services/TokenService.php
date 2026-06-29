<?php

namespace App\Services;

use App\Models\User;

class TokenService
{
    /**
     * Issue a signed token for the given user.
     *
     * Format: base64url(userId:issuedAt:email).hmacSha256
     */
    public static function issue(User $user): string
    {
        $payload = $user->id . ':' . time() . ':' . $user->email;
        $encodedPayload = self::base64UrlEncode($payload);

        return $encodedPayload . '.' . self::sign($encodedPayload);
    }

    /**
     * Verify a signed token and return the associated user, or null when the
     * token is malformed, has an invalid signature, or no longer matches a user.
     */
    public static function verify(?string $token): ?User
    {
        if (!is_string($token)) {
            return null;
        }

        $segments = explode('.', $token);
        if (count($segments) !== 2) {
            return null;
        }

        [$encodedPayload, $signature] = $segments;

        if (!hash_equals(self::sign($encodedPayload), $signature)) {
            return null;
        }

        $parts = explode(':', self::base64UrlDecode($encodedPayload));
        if (count($parts) !== 3) {
            return null;
        }

        [$userId, , $email] = $parts;

        $user = User::find($userId);
        if (!$user || !hash_equals($user->email, $email)) {
            return null;
        }

        return $user;
    }

    private static function sign(string $data): string
    {
        return hash_hmac('sha256', $data, (string) config('app.key'));
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
