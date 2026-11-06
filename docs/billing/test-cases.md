# Billing: test cases and open concerns

Legend: **Auto** = covered by `backend/tests/Feature/BillingTest.php` or a frontend spec. **E2E** = checked by hand in
Chrome (local, signed fake webhooks, no real Stripe). **Stripe** = needs real Stripe test keys (`sk_test_...`), the two
Price ids and `stripe listen`; not verified yet.

| # | Case | Expected | How |
| --- | --- | --- | --- |
| TC1 | Free user opens `/investments` | Redirect to `/premium` | E2E |
| TC2 | Free user calls `GET /api/investments` | 403 (no `view investments`) | Auto + E2E |
| TC3 | `GET /api/billing` as free | `premium:false`, plans, `pricing` (10 / 108 / 10 %) | Auto |
| TC4 | Checkout with invalid plan | 422 | Auto |
| TC5 | Checkout, plan without Price id | 503 | Auto |
| TC6 | Checkout, no Stripe secret | 503 (not a 500); UI says plans unavailable | Auto + E2E |
| TC7 | Checkout while already subscribed | 409 | Auto |
| TC8 | Checkout / portal without token | 401 | Auto |
| TC9 | Portal without billing account | 409 | Auto |
| TC10 | Portal, no Stripe secret | 503 | Auto |
| TC11 | Webhook without configured secret | Refused | Auto |
| TC12 | Webhook with bad signature | Refused, nothing granted | Auto |
| TC13 | `subscription.created` active | Role `premium`, Investments opens | Auto + E2E |
| TC14 | `subscription.updated` past_due | Keeps premium, page shows card warning + Manage billing | Auto + E2E |
| TC15 | `subscription.deleted` | Back to role `user`, Investments blocked | Auto + E2E |
| TC16 | `incomplete` payment | Not premium | Auto |
| TC17 | Admin / manually granted premium | Never changed by webhooks | Auto |
| TC18 | Admin panel Subscriptions page | Admin sees it, manager does not | Auto + E2E |
| TC19 | Real checkout, pay with test card 4242... | Redirect to `/premium?checkout=success`, polling, then Investments | Stripe |
| TC20 | Cancel at period end (portal) | Still premium, page shows end date, then drops at the end | Stripe |
| TC21 | Pay again after cancel / card update from portal | Premium restored | Stripe |
| TC22 | Checkout cancelled | `/premium?checkout=cancelled` shows "not charged" | Stripe |
| TC23 | Webhook retried (same event twice) | Idempotent | Stripe |
| TC24 | `SyncSubscriptions` command | Reconciles roles with Stripe status | Auto (logic), Stripe (real data) |

## Concerns

1. **Display price vs charged price.** `BILLING_MONTHLY_PRICE` / `BILLING_YEARLY_DISCOUNT` only drive the page. Stripe
   charges the amount of the Price. Change both together (or read the amount from Stripe and cache it).
2. **Currency.** The shown price is EUR; the user may pick another display currency in the app.
3. **`cancel_at_period_end` webhook needs the Stripe API.** Cashier fetches the item to compute the period end, so it
   fails with fake keys. Fine with real keys (TC20).
4. **Webhook hardening.** `RequireStripeWebhookSecret` refuses the route when no secret is set. The route is outside
   `auth.custom` on purpose; the signature is the only protection.
5. **Orphan rows.** Deleting `subscriptions` without their `subscription_items` breaks later webhooks (unique
   `stripe_id`). Only happens when editing the DB by hand.
6. **`/premium` layout.** It renders outside the app shell (no sidebar).
7. **Past due keeps Premium** until Stripe ends the subscription (after its retries). Change in `PremiumAccess` if the
   policy should be stricter.
8. **Pre-existing:** two `AvailableMonthTest` tests fail on `master` (date dependent); unrelated to billing.
