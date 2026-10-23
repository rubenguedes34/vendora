<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('recurrent:process')
    ->monthlyOn(1, '00:00')
    ->withoutOverlapping()
    ->runInBackground();

// Notifications (and their emails) are otherwise only generated when a user opens the app.
Schedule::command('notifications:generate')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->runInBackground();
