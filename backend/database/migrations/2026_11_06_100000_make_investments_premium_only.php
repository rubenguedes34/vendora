<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /** Investments become a paid feature: only premium (and admin) keep the permission. */
    public function up(): void
    {
        Role::where('name', 'user')->first()?->revokePermissionTo('view investments');
    }

    public function down(): void
    {
        Role::where('name', 'user')->first()?->givePermissionTo('view investments');
    }
};
