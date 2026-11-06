<?php

namespace App\Services;

use App\Models\User;

class PremiumAccess
{
    /**
     * Make the role match the Stripe subscription. Staff and manual grants (no subscription row) are left alone.
     * Idempotent: it only reads local state, so a repeated or reordered webhook cannot corrupt it.
     */
    public static function sync(User $user): void
    {
        if ($user->hasAnyRole(['admin', 'manager']) || ! $user->subscriptions()->exists()) {
            return;
        }

        $user->syncRoles([$user->subscribed('default') ? 'premium' : 'user']);
    }
}
