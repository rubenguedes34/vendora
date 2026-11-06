<?php

namespace App\Http\Controllers;

use App\Http\Requests\Billing\CheckoutRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/billing",
     *     summary="Premium status and available plans of the current user",
     *     tags={"Billing"},
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Billing status")
     * )
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $subscription = $user->subscription('default');

        return response()->json([
            'premium' => $user->can('view investments'),
            'status' => $subscription?->stripe_status,
            'cancels_at' => $subscription?->onGracePeriod() ? $subscription->ends_at : null,
            'has_customer' => $user->hasStripeId(),
            'plans' => array_keys(array_filter(config('billing.plans'))),
            'pricing' => $this->pricing(),
        ]);
    }

    /** @return array<string, array{price: float, months: int, discount: int}> */
    private function pricing(): array
    {
        $monthly = config('billing.display.monthly');
        $plan = fn (int $months, int $discount) => [
            'price' => round($monthly * $months * (1 - $discount / 100), 2),
            'months' => $months,
            'discount' => $discount,
        ];

        return [
            'monthly' => $plan(1, 0),
            'quarterly' => $plan(3, config('billing.display.quarterly_discount')),
            'semiannual' => $plan(6, config('billing.display.semiannual_discount')),
        ];
    }

    /**
     * @OA\Post(
     *     path="/api/billing/checkout",
     *     summary="Create a Stripe Checkout session for a plan",
     *     tags={"Billing"},
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true, @OA\JsonContent(required={"plan"},
     *
     *         @OA\Property(property="plan", type="string", enum={"monthly","quarterly","semiannual"}))),
     *
     *     @OA\Response(response=200, description="Checkout URL"),
     *     @OA\Response(response=409, description="Already subscribed"),
     *     @OA\Response(response=503, description="Plan not configured")
     * )
     */
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->subscribed('default')) {
            return response()->json(['message' => __('billing.already_subscribed')], 409);
        }

        $price = config('billing.plans.'.$request->plan);
        if (! $price || ! config('cashier.secret')) {
            return response()->json(['message' => __('billing.plan_unavailable')], 503);
        }

        $frontend = rtrim(config('app.frontend_url'), '/');
        $checkout = $user->newSubscription('default', $price)->checkout([
            'success_url' => $frontend.'/premium?checkout=success',
            'cancel_url' => $frontend.'/premium?checkout=cancelled',
        ]);

        return response()->json(['url' => $checkout->url]);
    }

    /**
     * @OA\Post(
     *     path="/api/billing/portal",
     *     summary="Stripe Customer Portal URL (cancel, change card, invoices)",
     *     tags={"Billing"},
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Portal URL"),
     *     @OA\Response(response=409, description="No billing account yet")
     * )
     */
    public function portal(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasStripeId()) {
            return response()->json(['message' => __('billing.no_customer')], 409);
        }

        if (! config('cashier.secret')) {
            return response()->json(['message' => __('billing.plan_unavailable')], 503);
        }

        return response()->json(['url' => $user->billingPortalUrl(rtrim(config('app.frontend_url'), '/').'/account')]);
    }
}
