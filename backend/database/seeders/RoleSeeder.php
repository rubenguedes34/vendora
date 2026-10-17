<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'access admin panel',
            'manage users',
            'view metrics',
            'view investments',
            'use ai support',
            'view health score',
            'export reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        /** @var Role $admin */
        $admin = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $admin->syncPermissions(Permission::all()->pluck('name')->toArray());

        /** @var Role $manager */
        $manager = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $manager->syncPermissions(['access admin panel', 'view metrics']);

        /** @var Role $userRole */
        $userRole = Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);
        $userRole->syncPermissions([
            'view investments',
            'use ai support',
            'view health score',
        ]);

        /** @var Role $premium */
        $premium = Role::firstOrCreate(['name' => 'premium', 'guard_name' => 'web']);
        $premium->syncPermissions([
            'view investments',
            'use ai support',
            'view health score',
            'export reports',
        ]);

        $firstUser = User::orderBy('id')->first();
        if ($firstUser && ! $firstUser->hasAnyRole(['admin', 'manager'])) {
            $firstUser->assignRole('admin');
        }
    }
}
