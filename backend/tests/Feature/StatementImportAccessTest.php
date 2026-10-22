<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StatementImportAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_admin_role_holds_import_statements_permission(): void
    {
        $this->assertTrue(Role::findByName('admin')->hasPermissionTo('import statements'));

        foreach (['user', 'premium', 'manager'] as $name) {
            $role = Role::where('name', $name)->first();
            $this->assertTrue($role === null || ! $role->hasPermissionTo('import statements'), "{$name} must not hold it");
        }
    }
}
