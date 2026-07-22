<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Role;

class MakeAdminCommand extends Command
{
    protected $signature = 'admin:make {email} {--role=admin}';

    protected $description = 'Assign an admin/manager role to a user by email';

    public function handle(): int
    {
        $email = $this->argument('email');
        $roleName = $this->option('role');

        if (! in_array($roleName, ['admin', 'manager', 'user'], true)) {
            $this->error('Role must be admin, manager or user.');
            return self::FAILURE;
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            $this->error("User [{$email}] not found.");
            return self::FAILURE;
        }

        Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);

        $user->syncRoles([$roleName]);

        $this->info("User [{$email}] is now a {$roleName}.");
        return self::SUCCESS;
    }
}
