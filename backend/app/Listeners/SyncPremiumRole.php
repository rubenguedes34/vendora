<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\PremiumAccess;
use Laravel\Cashier\Events\WebhookHandled;

/** Runs after Cashier has stored the subscription change, so the role follows the stored state. */
class SyncPremiumRole
{
    public function handle(WebhookHandled $event): void
    {
        if (! str_starts_with($event->payload['type'] ?? '', 'customer.subscription.')) {
            return;
        }

        $customer = $event->payload['data']['object']['customer'] ?? null;
        $user = $customer ? User::where('stripe_id', $customer)->first() : null;

        if ($user) {
            PremiumAccess::sync($user);
        }
    }
}
