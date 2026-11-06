<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Cashier skips signature checks when the secret is empty; that would let anyone grant premium. Fail closed. */
class RequireStripeWebhookSecret
{
    public function handle(Request $request, Closure $next)
    {
        abort_if(blank(config('cashier.webhook.secret')), 503, 'Stripe webhook secret is not configured.');

        return $next($request);
    }
}
