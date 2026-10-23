# Notifications and alert rules

## When they are generated

Two triggers, both calling `NotificationGenerator::generateFor($user)`:

- `NotificationController::generateIfStale` on `GET /notifications` and `/notifications/unread-count` (the
  sidebar badge polls it), at most once every 10 minutes per user (cache key `notifications:generated:{id}`).
- The `notifications:generate` command, daily at 08:00 for every non-blacklisted user, so users who never open
  the app still get their emails (see [emails.md](emails.md)).

The other scheduled job is `recurrent:process` (1st of the month). Both are in `routes/console.php`; under Docker
the `scheduler` service runs them.

## What gets generated (`app/Services/NotificationGenerator.php`)

| type | Trigger |
| --- | --- |
| `budget_almost_exceeded` | spent >= 80% of a budget this month |
| `budget_exceeded` | spent > budget limit (removes the "almost" one for the same budget/month) |
| `alert_rule_triggered` | an active `AlertRule` (category limit or total spend limit) reached |
| `recurring_due` | an active recurrent transaction reached its due day this month |
| `monthly_report_ready` | once per month, about the **previous** month (key `monthly-report-{Y-m of last month}`) |
| `savings_goal_completed` | saved >= 20% of the default monthly income |
| `investment_reached_target` | portfolio value >= 110% of initial amounts |

## Dedupe rules (important)

- `addOnce` skips when a notification with the same `type` and `data->key` exists, **including soft-deleted
  ones**, so a notification the user deleted does not come back.
- Keys are month-scoped (e.g. `budget-{id}-{Y-m}`); alert-rule keys also include the threshold, so raising a
  limit can alert again the same month.
- Soft-deleted rows older than 60 days are purged, since their month-scoped key can no longer be generated.
- Exception: `budget_almost_exceeded` is hard-deleted when superseded by `budget_exceeded`, so it can return
  if spending drops back below the limit.

## Alert rules

`AlertRule`: `type` (`category_limit` | `total_spend_limit`), `category_id`, `threshold`, `is_active`. Monthly
period and a single threshold only (marked `shortcut:` in the generator). CRUD at `/api/alert-rules`
(`AlertRuleController`); frontend `AlertRulesComponent`.

## i18n and money

- `title`/`body` are English fallbacks; the SPA translates from `data.i18n.{key,params}` (`notifications.json`).
  Adding a notification type = generator + EN and PT keys.
- Amounts are written as `$12.34`; `$` is a placeholder the SPA swaps for the user's currency (currencyText pipe).
