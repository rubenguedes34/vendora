# Health score

`GET /api/financial-records/health-score` (permission `view health score`) returns the current score plus
a 6-month history.

## How it is calculated (`app/Services/HealthScoreCalculator.php`)

Each category scores 0-100 from fixed thresholds, then the overall score is the weighted sum (clamped 0-100):

| Category | Weight | Measures |
| --- | --- | --- |
| `savings_rate` | 25 | (income - expense) / income for the month |
| `emergency_fund` | 20 | all-time cash (income - expense) / the user's default `monthly_expenses`, capped at 12 months |
| `budget_adherence` | 20 | share of that month's budgets not exceeded (100 when no budgets) |
| `debt_ratio` | 15 | **placeholder**: always 100, debts are not tracked yet |
| `investment_rate` | 10 | current investment value / month income |
| `income_stability` | 10 | variation (std dev / mean) of the last 6 months of income (100 when no income) |

- `both()` fetches the transaction rows once and reuses them for the current score and the history; prefer it
  over calling `calculate()` and `history()` separately.
- Each category carries `suggestion` (English fallback) and `suggestion_key` / `suggestion_params`; the SPA
  translates from the key (`health.json`). Add the key to both EN and PT when adding a threshold.
- Weights can be overridden through the constructor.

## Caching

`FinancialRecordController` caches the score and net worth for 15 minutes (`health-score:{id}`,
`net-worth:{id}`), so a stale-looking figure is usually the TTL. `FinancialCacheService::clearForUser` forgets
both keys; it is called from the `saved`/`deleted` hooks of `Transaction`, `FinancialRecord`, `Budget` and
`Investment`. A new model that feeds these figures must call it too.
