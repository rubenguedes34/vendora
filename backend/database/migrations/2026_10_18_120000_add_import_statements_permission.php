<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Importing bank statements is admin-only for now. A migration, not just the seeder, because the seeder
     * only runs on an empty database. Opening it up later is one givePermissionTo.
     */
    public function up(): void
    {
        $permission = Permission::firstOrCreate(['name' => 'import statements', 'guard_name' => 'web']);

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web'])->givePermissionTo($permission);
    }

    public function down(): void
    {
        Permission::where('name', 'import statements')->delete();
    }
};
