<?php

namespace App\Notifications;

use Carbon\Carbon;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email twin of an in-app notification, built from its data.i18n key and params. */
class AppAlertMail extends Notification
{
    public function __construct(private string $key, private array $params = []) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        // Amounts carry a '$' placeholder for the SPA to swap; the user's currency is client-side, so the email shows plain numbers.
        $params = $this->params;
        foreach (['amount', 'spent', 'limit'] as $field) {
            if (isset($params[$field])) {
                $params[$field] = str_replace('$', '', $params[$field]);
            }
        }
        if (isset($params['month'])) {
            $params['month'] = Carbon::createFromFormat('!Y-m', $params['month'])->locale($this->locale ?? 'en')->translatedFormat('F Y');
        }

        return (new MailMessage)
            ->subject(__("mail.alerts.{$this->key}.subject", $params))
            ->greeting(__('mail.greeting', ['name' => $notifiable->name]))
            ->line(__("mail.alerts.{$this->key}.line", $params))
            ->action(__('mail.open_app'), rtrim(config('app.frontend_url'), '/').'/notifications')
            ->salutation(__('mail.footer'));
    }
}
