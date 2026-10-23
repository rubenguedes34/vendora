<?php

namespace App\Providers;

use App\Models\AlertRule;
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
use App\Services\LaravelStatementAi;
use App\Services\PdfTextExtractor;
use App\Services\SmalotPdfTextExtractor;
use App\Services\StatementAi;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PdfTextExtractor::class, SmalotPdfTextExtractor::class);
        $this->app->bind(StatementAi::class, LaravelStatementAi::class);
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach ([
            AlertRule::class,
            Budget::class,
            FinancialRecord::class,
            Investment::class,
            Notification::class,
            RecurrentTransaction::class,
            Tag::class,
            Transaction::class,
        ] as $model) {
            Gate::policy($model, OwnedByUserPolicy::class);
        }
        Gate::policy(User::class, UserPolicy::class);

        // Account emails: the reset link opens the SPA page, and both carry the app's own localized copy.
        ResetPassword::createUrlUsing(fn ($user, string $token) => rtrim(config('app.frontend_url'), '/')
            .'/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset()));
        ResetPassword::toMailUsing(fn ($user, string $token) => (new MailMessage)
            ->subject(__('mail.reset.subject'))
            ->greeting(__('mail.greeting', ['name' => $user->name]))
            ->line(__('mail.reset.line'))
            ->action(__('mail.reset.action'), rtrim(config('app.frontend_url'), '/').'/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset()))
            ->line(__('mail.reset.expires', ['count' => config('auth.passwords.users.expire')]))
            ->salutation(__('mail.footer_account')));
        VerifyEmail::toMailUsing(fn ($user, string $url) => (new MailMessage)
            ->subject(__('mail.verify.subject'))
            ->greeting(__('mail.greeting', ['name' => $user->name]))
            ->line(__('mail.verify.line'))
            ->action(__('mail.verify.action'), $url)
            ->line(__('mail.verify.ignore'))
            ->salutation(__('mail.footer_account')));

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // These cover the endpoints that spend third-party API quota.
        RateLimiter::for('ai', function (Request $request) {
            $key = $request->user()?->id ?: $request->ip();

            return [
                Limit::perMinute(10)->by($key),
                Limit::perDay(max(1, (int) config('ai.support.daily_limit', 100)))->by('day:'.$key),
            ];
        });

        RateLimiter::for('import', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('market', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });
    }
}
