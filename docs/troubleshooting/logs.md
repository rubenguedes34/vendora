# Logs and the admin Logs page

Backend logs go to one daily file per area in `backend/storage/logs/` (kept `LOG_DAILY_DAYS`, default 14).
Use `Log::channel('<area>')`; anything else goes to the default `laravel.log`.

| Channel | File | What is logged |
| --- | --- | --- |
| `auth` | `auth-YYYY-MM-DD.log` | invalid/expired token, blacklisted account blocked, bad credentials, login/register/Google failures |
| `import` | `import-*.log` | statement parse failure (code only), PDF unreadable, AI suggestion lock busy, import result (counts) |
| `ai` | `ai-*.log` | chat model failed / answered / fell back to FAQ, statement AI model timing |
| `market` | `market-*.log` | provider HTTP errors and failures (Finnhub, Yahoo, CoinGecko) |
| `scheduler` | `scheduler-*.log` | `recurrent:process` result and failing rules |
| default | `laravel.log` | everything else, notifications created, financial cache cleared (debug) |

Every logged exception also carries the `route` (set in `bootstrap/app.php`; Laravel adds the user id itself).

## Never log

Statement text or row descriptions, tokens, passwords, emails, the Finnhub key (it travels in the request URL, so
log the exception class, never its message). Ids, codes, counts, durations and HTTP status are fine.

## Admin page

`/admin/logs` (Filament, group "Troubleshooting"), only users with the `manage users` permission (admin).
One tab per area (`auth`, `import`, `ai`, `market`, `scheduler`, and `app` for `laravel*.log`), a dropdown with that area's daily files, a level filter and text search. Filters are kept per tab, and each tab also filters on fields of the log context (exact value): auth `user_id`/`ip`, import `user_id`/`code`, ai `user_id`/`model`, market `provider`/`status`/`symbol`, scheduler `month`/`recurrent_id`, app `user_id`/`route` (list in `Logs::CONTEXT_FILTERS`; the field must be in the log call's context array). Only the last ~512 KB of a file is read, and only `*.log` files
inside `storage/logs` can be opened (`App\Services\LogReader`). Stack-trace lines are filtered one by one.

## Adding a log line

`Log::channel('market')->warning('Short constant message', ['user_id' => $id, 'status' => 502]);`
Constant message, data in the context array, so the file stays greppable. For a new area add its name to the
list at the top of `backend/config/logging.php`.

## Good to know

- Exceptions are logged as class + code + `file:line`, never their message: a `QueryException` quotes SQL bindings (emails,
  password hashes) and HTTP exceptions quote the request URL (API keys).
- Failed logins and invalid tokens log the client IP (personal data, kept `LOG_DAILY_DAYS` days).
- Under Docker `LOG_CHANNEL=stderr`, so `laravel.log` is never written: the `app` tab stays empty and that output is
  only in `docker compose logs backend`. The area channels always write files (kept in the `backend-storage` volume).
