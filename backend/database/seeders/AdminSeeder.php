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
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        /** @var Role $admin */
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions($permissions);

        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);

        $password = env('ADMIN_PASSWORD');
        if (! $password) {
            $password = Str::random(20);
            $this->command?->warn('No ADMIN_PASSWORD set; generated random password for admin@vendora.com: '.$password);
        }

        $user = User::updateOrCreate(
            ['email' => 'admin@vendora.com'],
            [
                'name' => 'Admin',
                'email' => 'admin@vendora.com',
                'password' => Hash::make($password),
                'monthly_income' => 3500.00,
                'monthly_expenses' => 1200.00,
            ]
        );

        $user->syncRoles(['admin']);
    }
}
