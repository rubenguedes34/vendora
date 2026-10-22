# Monthly records and availability

## The rule

A month (`FinancialRecord`, one row per user/year/month) is **its base plus what its transactions add**:

- base = the user's default `monthly_income` / `monthly_expenses`, or the record's own `base_income` /
  `base_expenses` when `is_custom` is true;
- `monthly_income` / `monthly_expenses` on the record = base + sum of that month's income / expense transactions.

So the user's monthly figures are a default plan that transactions add to, not money already spent.

## Where it lives

- `app/Models/FinancialRecord.php`
  - `syncFromTransactions($user, $year, $month)`: recomputes and saves a month.
  - `ensureMonth(...)`: the stored record, or derives it on first use (any month can be read).
  - `syncDefaultMonths($user)`: re-derives every non-custom month after the default changed.
- `app/Models/Transaction.php` `saved`/`deleted` hooks call `syncFromTransactions`; moving a transaction to
  another month also re-syncs the month it left.
- `app/Services/AvailabilityCalculator.php`: `calculate` (available, pending recurrents, daily average,
  projected balance, daily allowance), `comparison` (vs previous month), `dailyBalance` (running balance
  series for the chart).
- `app/Http/Controllers/FinancialRecordController.php`: `/financial-records/*` routes.
- Frontend: `services/financial.service.ts`, dashboard / net-worth / allocation components.

## Gotchas

- Changing transaction amounts without going through Eloquent model events (raw/mass queries) skips the sync
  and leaves the record stale. Use model saves.
- Availability: only the **current** month projects (days remaining); past months report plain balance,
  future months have all days left.
- Recurrent templates only count as money once copied to the month. A template not yet copied and due on or
  after today is "pending"; the "copied" check matches description + category + amount + type + due date, same
  as `RecurrentTransactionController::copyToMonth` (day clamped to the month's last day).
- `dailyBalance` returns `null` for days after today in the current month and for every day of a future month,
  so the chart line stops there. Past days with no transactions still carry the running balance.
- Keep `FinancialRecordMonthBaseTest` passing when touching this logic.
- `year` is cast to integer on purpose (MySQL returns YEAR as a string; the SPA compares with `===`).
