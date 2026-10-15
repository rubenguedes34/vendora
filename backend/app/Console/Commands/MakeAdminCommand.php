<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\DefaultCategories;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class MakeAdminCommand extends Command
{
    protected $signature = 'admin:make {email} {--role=admin} {--create : Create the user when it does not exist yet}';

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
        if (! $user && $this->option('create')) {
            // No usable password: the person signs in with Google, which links
            // to this record by email on first login.
            $user = User::create([
                'name' => Str::before($email, '@'),
                'email' => $email,
                'password' => Hash::make(Str::random(32)),
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();
            DefaultCategories::ensure();
            $this->info("User [{$email}] created.");
        }

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
