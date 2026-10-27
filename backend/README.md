# Vendora Backend

JSON API for the Vendora Angular SPA, plus a Filament 5 admin panel at `/admin`.

- PHP 8.5, Laravel 13
- SQLite locally, MySQL 8.4 under Docker
- Served by [FrankenPHP](https://frankenphp.dev) in Docker (`dunglas/frankenphp:1-php8.5`)

## Run locally

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate && php artisan db:seed
php artisan serve                       # API on :8000
```

Needs the PHP `intl` extension (Filament).

## Run with Docker

From the repo root: `docker compose up --build` (API on :8000, frontend on :4200).

## Common commands

```bash
php artisan test                        # in-memory SQLite
composer lint                           # check style (Pint)
composer format                         # fix style
php artisan l5-swagger:generate         # after changing @OA annotations
php artisan admin:make <email> --role=admin
```

Swagger UI: `http://localhost:8000/api/documentation`.

## More

Feature docs live in [`../docs/INDEX.md`](../docs/INDEX.md). Backend conventions are in [`CLAUDE.md`](CLAUDE.md).
