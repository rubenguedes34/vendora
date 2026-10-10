<?php

namespace App\Providers;

use App\Models\Budget;
use App\Models\FinancialRecord;
use App\Models\Investment;
use App\Models\Notification;
use App\Models\RecurrentTransaction;
use App\Models\Tag;
use App\Models\Transaction;
use App\Models\User;
use App\Policies\OwnedByUserPolicy;
use App\Policies\UserPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The model to policy mappings for the application.
     *
     * @var array<class-string, class-string>
     */
    protected $policies = [
        Budget::class => OwnedByUserPolicy::class,
        FinancialRecord::class => OwnedByUserPolicy::class,
        Investment::class => OwnedByUserPolicy::class,
        Notification::class => OwnedByUserPolicy::class,
        RecurrentTransaction::class => OwnedByUserPolicy::class,
        Tag::class => OwnedByUserPolicy::class,
        Transaction::class => OwnedByUserPolicy::class,
        User::class => UserPolicy::class,
    ];

    /**
     * Register any authentication / authorization services.
     */
    public function boot(): void
    {
        //
    }
}
