#!/bin/sh
set -e

cd /app

# The storage volume starts empty on some setups; make sure Laravel's
# writable directories exist.
mkdir -p storage/app/public storage/app/private storage/framework/cache/data \
    storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

# Without an APP_KEY from the environment, generate one once and keep it in the
# storage volume so it survives container rebuilds.
if [ -z "$APP_KEY" ]; then
    if [ ! -s storage/app/app.key ]; then
        php artisan key:generate --show --no-ansi > storage/app/app.key
        echo "Generated a new APP_KEY (stored in the storage volume)."
    fi
    APP_KEY="$(cat storage/app/app.key)"
    export APP_KEY
fi

php artisan storage:link --force >/dev/null 2>&1 || true

echo "Running migrations..."
php artisan migrate --force

# Seed only a fresh database, so restarts never touch existing data.
USER_COUNT="$(php -r 'require "vendor/autoload.php"; $app = require "bootstrap/app.php"; $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo App\Models\User::count();')"
if [ "$USER_COUNT" = "0" ]; then
    echo "Empty database, seeding..."
    php artisan db:seed --force
fi

# Make sure the configured account (e.g. your Google email) exists and is an
# admin. Runs on every start; if the account is new, signing in with Google
# links to it by email.
if [ -n "$ADMIN_EMAIL" ]; then
    php artisan admin:make "$ADMIN_EMAIL" --create
fi

exec "$@"
