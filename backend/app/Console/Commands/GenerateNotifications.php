<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\NotificationGenerator;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GenerateNotifications extends Command
{
    protected $signature = 'notifications:generate';

    protected $description = 'Generate notifications (and their emails) for every active user';

    public function handle(NotificationGenerator $generator): int
    {
        $count = 0;

        User::whereNull('blacklisted_at')->each(function (User $user) use ($generator, &$count) {
            try {
                $generator->generateFor($user);
                $count++;
            } catch (\Throwable $e) {
                Log::channel('scheduler')->error('Notification generation failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            }
        });

        $this->info("Generated notifications for {$count} users.");

        return self::SUCCESS;
    }
}
