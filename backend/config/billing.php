<?php

// Stripe price ids per plan. A plan with an empty id is not offered (checkout answers 503).
return [
    'plans' => [
        'monthly' => env('STRIPE_PRICE_MONTHLY'),
        'quarterly' => env('STRIPE_PRICE_QUARTERLY'),
        'semiannual' => env('STRIPE_PRICE_SEMIANNUAL'),
    ],

    // Display only: what the page shows. Stripe charges the amount of the Price above, so keep them in sync.
    'display' => [
        'monthly' => (float) env('BILLING_MONTHLY_PRICE', 10),
        'quarterly_discount' => (int) env('BILLING_QUARTERLY_DISCOUNT', 10),
        'semiannual_discount' => (int) env('BILLING_SEMIANNUAL_DISCOUNT', 15),
    ],
];
