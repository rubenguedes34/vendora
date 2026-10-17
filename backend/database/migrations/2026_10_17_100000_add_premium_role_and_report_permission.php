<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * The PDF report is the first paid feature: only the premium role (and admins) hold the permission.
     * A migration, not just the seeder, because the seeder only runs on an empty database.
     */
    public function up(): void
    {
        $report = Permission::firstOrCreate(['name' => 'export reports', 'guard_name' => 'web']);

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web'])->givePermissionTo($report);

        Role::firstOrCreate(['name' => 'premium', 'guard_name' => 'web'])
            ->syncPermissions(['view investments', 'use ai support', 'view health score', 'export reports']);
    }

    public function down(): void
    {
        Role::where('name', 'premium')->delete();
        Permission::where('name', 'export reports')->delete();
    }
};
