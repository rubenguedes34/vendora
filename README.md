# Vendora <img src="./vendora_logo.png" valign="middle" width="32" height="32">

Vendora is a modern, intuitive financial ecosystem designed to help individuals take absolute control over their monthly budgeting and long-term investments. By bridging the gap between daily cash flow and wealth building, Vendora gives you a clear, high-level vantage point over your net worth.

> **Project Status:** Early Development — core features and admin tooling are in place. The codebase currently uses PHP 8.5, Laravel 13, Angular 22, and Filament 5.

---

## ✨ Features

- **Dashboard:** Overview of balance, monthly income, and expenses with real-time currency calculation.
- **Transactions:** Log, categorize, and audit income and expenses with receipt attachments.
- **Budgeting:** Set monthly category budgets and track spending against them.
- **Investments & Watchlist:** Track holdings manually and look up market quotes.
- **Recurring Transactions:** Schedule and copy repeating transactions.
- **Notifications:** Personalized financial insights and alerts.
- **AI Support:** Built-in support chat with FAQ fallback when no OpenAI key is configured.
- **Admin Panel:** Filament-based admin dashboard at `/admin` with dashboard metrics and user management.
- **API Documentation:** Auto-generated Swagger/OpenAPI docs.

---

## 🛠️ Technology Stack

- **Backend:** PHP 8.5.4, Laravel 13.22.0, SQLite by default (or MySQL via Eloquent)
- **Frontend:** Angular 22.0.4, TypeScript 6.0.3, Tailwind CSS 3.4.0, Chart.js 4.5.1, RxJS 7.8.2
- **Admin UI:** Laravel Filament 5.7.3 at `/admin`
- **Auth:** Custom signed token (`App\Services\TokenService`) with `auth.custom` middleware
- **Roles & Permissions:** `spatie/laravel-permission` 8.3.0 with the `web` guard
- **AI:** `Laravel AI` package with OpenAI fallback to local FAQ matching
- **API Docs:** L5 Swagger 11.1.0, Swagger-PHP 6, Doctrine Annotations 2.0.2
- **Testing:** PHPUnit 13.2.5, Laravel Pint 1.29.3

---

## 🐳 Running with Docker

The whole stack (MySQL, Laravel backend, Angular frontend) runs with one command:

```bash
docker compose up --build
```

On the first start the backend container runs the migrations and seeds the database. Set `ADMIN_EMAIL` in a root `.env` to make your own (e.g. Google) account an admin on every start; it is created if missing and Google login links to it by email. The seeded admin account is `admin@vendora.com`; its password is the `ADMIN_PASSWORD` from `backend/.env` if you set one, otherwise a random one is printed in the logs (`docker compose logs backend`).

- API keys and `APP_KEY` are read from `backend/.env` when that file exists. Without an `APP_KEY`, one is generated and kept in the `backend-storage` volume.
- Database credentials, `ADMIN_EMAIL` and the MySQL host port can be overridden in a root `.env`; see `.env.docker.example`.
- MySQL is published on host port `3307`. Data lives in the `database-data` volume; `docker compose down -v` wipes it.
- Stop any local `php artisan serve` / `ng serve` first, since the containers use ports 8000 and 4200.
