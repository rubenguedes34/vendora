# Tokens, roles and permissions

## Tokens

- `TokenService` issues Sanctum personal access tokens (`issue`), looks them up (`find`/`verify`, deleting
  expired ones) and revokes them (`revokeAll`, optionally keeping the current one). Expiry comes from
  `config('sanctum.expiration')`.
- `auth.custom` (`app/Http/Middleware/CustomAuth.php`) reads the bearer token: no token or invalid/expired -> 401;
  blacklisted user -> 403. No cookie sessions.
- Blacklisted users are also rejected at login and Google exchange (`AuthController`).
- Login, register, `/api/auth/google/exchange` and `/api/setup` are public and throttled.

## Google sign-in

1. `GET /auth/google` (web route) redirects to Google; `GET /auth/google/callback` checks the verified email,
   creates or links the user, caches a single-use code (hashed, 1 minute) and redirects to the SPA
   `/auth/callback?code=`.
2. `POST /api/auth/google/exchange` (throttled) pulls the code and returns the API token.
The two web routes are not throttled.
- Frontend: `AuthService` holds the user and roles; `auth.interceptor.ts` attaches the token (never set
  `Authorization` by hand); guards in `app.routes.ts` (`authGuard`, `guestGuard`, `setupGuard`, `homeGuard`).

## Roles and permissions (Spatie, seeded by `RoleSeeder`)

| Role | Permissions |
| --- | --- |
| `admin` | all, including `manage users`, `import statements` |
| `manager` | `access admin panel`, `view metrics` |
| `user` | `view investments`, `use ai support`, `view health score` |
| `premium` | `user` set + `export reports` |

The first user is made `admin` by the seeder. Gate features with `permission:<name>` middleware, never role names.
The SPA only hides UI; the backend is the authority.

**Adding a permission:** add it to `RoleSeeder`, add a migration that creates it and grants it to the roles
(see `2026_10_18_120000_add_import_statements_permission.php`) so existing databases get it, then guard the
route with `permission:<name>`.

## Admin panel

Filament at `/admin` uses the web session, not the bearer token. The SPA bridges them:

1. `POST /api/admin/panel-link` (throttled) returns a URL with a single-use code (hashed, cached 1 minute).
2. The browser opens `GET /auth/admin-panel?code=` (`AuthController::enterAdminPanel`, throttled), which logs the
   web guard in and redirects to `/admin`; a bad code redirects to the Filament login.

Every `/api/admin/*` route needs `access admin panel`; metrics also need `view metrics` and user management
needs `manage users`.

### Admin dashboard

Widgets in `app/Filament/Widgets`: app-health stats (users, new this month, active 30d, blacklisted, premium,
statement imports), users by role, and feature adoption (users with at least one
transaction/budget/investment/recurrent/alert rule). No per-user money figures on purpose. "Active users" counts
distinct users whose token `last_used_at` is within 30 days; `CustomAuth` refreshes it at most once an hour.

## Ownership

Records are scoped to the authenticated user. `OwnedByUserPolicy` is registered for the user-owned models in
`AppServiceProvider`; another user's record must answer **404**, not 403 (don't reveal ids).
