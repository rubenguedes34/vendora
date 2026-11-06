<?php

namespace App\Console\Commands;

use App\Services\PremiumAccess;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Subscription;

class SyncSubscriptions extends Command
{
    protected $signature = 'billing:sync';

    protected $description = 'Re-read every subscription from Stripe and fix roles after missed webhooks';

    public function handle(): int
    {
        $count = 0;

        Subscription::with('owner')->each(function (Subscription $subscription) use (&$count) {
            try {
                $subscription->syncStripeStatus();
                PremiumAccess::sync($subscription->owner);
                $count++;
            } catch (\Throwable $e) {
                Log::error('Subscription sync failed', ['subscription' => $subscription->stripe_id, 'error' => $e->getMessage()]);
            }
        });

        $this->info("Synced {$count} subscriptions.");

        return self::SUCCESS;
    }
}
