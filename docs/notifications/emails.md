# Emails

Laravel mail with Markdown templates, English and Portuguese (user's `locale`). Emails are sent **synchronously**
(no queue worker runs under Docker); a send failure is logged (`Email could not be sent`) and never breaks the request.

## What is sent

| Email | When | Admin switch |
| --- | --- | --- |
| budget exceeded | `budget_exceeded` notification is created | `mail.budget` |
| spending limit reached | `alert_rule_triggered` created | `mail.alert_rule` |
| recurring due | `recurring_due` created | `mail.recurring_due` |
| monthly report ready | `monthly_report_ready` created (about the previous month) | `mail.monthly_report` |
| password reset | `POST /api/forgot-password` | master only |
| verify email | register, email change, `POST /api/email/resend` | master only |

Not emailed: `budget_almost_exceeded`, savings goal, investment target.

A notification email goes out only when `NotificationGenerator::addOnce` **creates** the row, so the dedupe rules in
[notifications.md](notifications.md) also mean one email per event. The text comes from `data.i18n` key/params
(`lang/*/mail.php`, `mail.alerts.<key>`). Amounts have the `$` placeholder stripped: the user's currency is a client
preference, so the email shows plain numbers.

## The gate (`app/Support/EmailGate.php`)

Every send goes through `EmailGate::send`. A notification email needs **master on AND its type on AND the user's
`email_notifications` true**. Account emails (reset/verify) ignore the type switches and the user option, but the
**master switch blocks them too**; turn it off and nobody can reset a password.

- Admin: Filament page **Settings > Email** (`manage users`). Values live in the `settings` table
  (`App\Models\Setting`, cached); each toggle saves immediately. Everything defaults to on.
- User: "Email notifications" checkbox in Account (`PUT /api/user/profile`, `email_notifications`).

## Password reset and verification

- `POST /api/forgot-password` always answers 200 (no email enumeration). The link opens the SPA at
  `/reset-password?token=&email=`; `POST /api/reset-password` sets the password and revokes all the user's tokens.
- Verification is **soft**: login works unverified. Existing users were backfilled as verified, Google sign-ups
  are verified, and changing the email clears it and sends a new link. The signed link
  (`GET /api/email/verify/{id}/{hash}`) redirects to `/login?verified=1`. Account shows a banner with "resend".

## Templates

`resources/views/vendor/mail` (published Laravel mail views); the theme is `html/themes/default.css` (teal button).
All emails are `MailMessage`s: greeting, line, button, footer. Reset/verify are set in `AppServiceProvider::boot`;
notification emails are `App\Notifications\AppAlertMail`.

## Running it

- Local Docker: the `mailpit` service catches everything at http://localhost:8025; backend and `scheduler`
  default to `MAIL_MAILER=smtp`, host `mailpit`. For real delivery set `MAIL_MAILER`, `MAIL_HOST` and `MAIL_PORT` in the **root** `.env` (compose passes
  them and they override `backend/.env`); `MAIL_USERNAME`, `MAIL_PASSWORD` and `MAIL_FROM_*` stay in `backend/.env`.
- Without Docker, `MAIL_MAILER=log` writes emails to the log.
- The first scheduler run can email budgets that were already exceeded before this existed (once).
