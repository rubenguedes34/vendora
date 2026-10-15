<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The general 'api' limiter lives in RouteServiceProvider; these cover
        // the endpoints that spend third-party API quota.
        RateLimiter::for('ai', function (Request $request) {
            $key = $request->user()?->id ?: $request->ip();

            return [
                Limit::perMinute(10)->by($key),
                Limit::perDay(max(1, (int) config('ai.support.daily_limit', 100)))->by('day:'.$key),
            ];
        });

        RateLimiter::for('market', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });
    }
}
