<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            'access admin panel',
            'manage users',
            'view metrics',
            'view investments',
            'use ai support',
            'view health score',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        /** @var Role $admin */
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all()->pluck('name')->toArray());

        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);

        // Only set a password when creating the admin or when ADMIN_PASSWORD is
        // given, so re-seeding never silently resets an existing admin's password.
        $password = env('ADMIN_PASSWORD');
        $user = User::where('email', 'admin@vendora.com')->first();

        if (! $user) {
            if (! $password) {
                $password = Str::random(20);
                $this->command?->warn('No ADMIN_PASSWORD set; generated random password for admin@vendora.com: '.$password);
            }

            $user = User::create([
                'name' => 'Admin',
                'email' => 'admin@vendora.com',
                'password' => Hash::make($password),
                'monthly_income' => 3500.00,
                'monthly_expenses' => 1200.00,
            ]);
        } elseif ($password) {
            $user->update(['password' => Hash::make($password)]);
        }

        $user->syncRoles(['admin']);
    }
}
