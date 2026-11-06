<?php

// Stripe price ids per plan. A plan with an empty id is not offered (checkout answers 503).
return [
    'plans' => [
        'monthly' => env('STRIPE_PRICE_MONTHLY'),
        'yearly' => env('STRIPE_PRICE_YEARLY'),
    ],

    // Display only: what the page shows. Stripe charges the amount of the Price above, so keep them in sync.
    'display' => [
        'monthly' => (float) env('BILLING_MONTHLY_PRICE', 10),
        'yearly_discount' => (int) env('BILLING_YEARLY_DISCOUNT', 10),
    ],
];
