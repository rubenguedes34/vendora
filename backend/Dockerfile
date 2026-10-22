# Laravel API + Filament admin, served by FrankenPHP.
FROM dunglas/frankenphp:1-php8.4

RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/* \
    && install-php-extensions pdo_mysql intl zip gd bcmath pcntl exif opcache calendar

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Install dependencies first so this layer is cached until composer files change.
# Dev dependencies are kept: the demo seeder needs Faker.
COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts --no-autoloader

COPY . .
RUN composer dump-autoload --optimize --no-scripts \
    && php artisan package:discover --ansi \
    && php artisan filament:assets --ansi

RUN cp docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["frankenphp", "php-server", "--root", "public/", "--listen", ":8000"]
