# Vendora docs

Living docs, one folder per area. Read the area you are touching, not all of them.
Update (or create) the matching file in the same change as the code.
`docs/superpowers/` holds dated specs and plans (gitignored); these docs hold what is true now.

| I want to know about... | Read |
| --- | --- |
| How a month's income/expenses/savings are derived, availability, daily balance | [finance/monthly-records.md](finance/monthly-records.md) |
| How the health score is calculated and its caching | [finance/health-score.md](finance/health-score.md) |
| Importing a bank statement PDF into transactions | [transactions/statement-import.md](transactions/statement-import.md) |
| Notifications, alert rules, when and how they are generated | [notifications/notifications.md](notifications/notifications.md) |
| Tokens, blacklisting, roles and permissions, admin panel access | [auth/tokens-and-permissions.md](auth/tokens-and-permissions.md) |
| The AI support chat, providers, FAQ fallback | [ai-support/support-chat.md](ai-support/support-chat.md) |
| Log files per area, the admin Logs page, what must never be logged | [troubleshooting/logs.md](troubleshooting/logs.md) |

Not covered here (read the code or `backend/CLAUDE.md` / `frontend/CLAUDE.md`): budgets, investments,
recurrent transactions, tags, reports, market data, theming, i18n, PWA.
