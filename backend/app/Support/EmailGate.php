<?php

namespace App\Support;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;

/** The one place that decides whether an email goes out: admin master switch, admin per-type switch, user opt-out. */
class EmailGate
{
    public const MASTER = 'mail.enabled';

    /** Notification type => admin setting key. */
    public const TYPES = [
        'budget_exceeded' => 'mail.budget',
        'alert_rule_triggered' => 'mail.alert_rule',
        'recurring_due' => 'mail.recurring_due',
        'monthly_report_ready' => 'mail.monthly_report',
    ];

    /** @param string|null $type a TYPES key; null is an account email (reset/verify), which ignores the user opt-out. */
    public static function allows(User $user, ?string $type = null): bool
    {
        if (! Setting::get(self::MASTER, true)) {
            return false;
        }
        if ($type === null) {
            return true;
        }

        return (bool) Setting::get(self::TYPES[$type], true) && $user->email_notifications !== false;
    }

    /** Sends when allowed. A mail failure is logged, never thrown, so it cannot break the request that triggered it. */
    public static function send(User $user, Notification $notification, ?string $type = null): void
    {
        if (! self::allows($user, $type)) {
            return;
        }

        try {
            $user->notify($notification->locale($user->locale));
        } catch (\Throwable $e) {
            Log::warning('Email could not be sent', ['user_id' => $user->id, 'type' => $type, 'error' => $e->getMessage()]);
        }
    }
}
