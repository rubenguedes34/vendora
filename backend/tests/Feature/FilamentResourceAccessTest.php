<?php

namespace Tests\Feature;

use App\Filament\Resources\CategoryResource;
use App\Filament\Resources\InvestmentResource;
use App\Filament\Resources\UserResource;
use App\Filament\Resources\UserResource\Pages\EditUser;
use App\Filament\Widgets\LatestUsersTable;
use App\Models\Budget;
use App\Models\Category;
use App\Models\User;
use Filament\Actions\DeleteAction;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use LogicException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class FilamentResourceAccessTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $role, array $permissions): User
    {
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web'])->syncPermissions($permissions);

        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_manager_cannot_reach_resources_that_touch_other_users_data(): void
    {
        $this->actingAs($this->userWithRole('manager', ['access admin panel', 'view metrics']));

        foreach ([CategoryResource::class, InvestmentResource::class] as $resource) {
            $this->assertFalse($resource::canAccess(), $resource);
        }
    }

    public function test_admin_reaches_those_resources(): void
    {
        $this->actingAs($this->userWithRole('admin', ['access admin panel', 'view metrics', 'manage users']));

        foreach ([CategoryResource::class, InvestmentResource::class] as $resource) {
            $this->assertTrue($resource::canAccess(), $resource);
        }
    }

    public function test_panel_delete_authorization_refuses_self_and_the_last_admin(): void
    {
        $admin = $this->userWithRole('admin', ['access admin panel', 'view metrics', 'manage users']);
        $other = User::factory()->create();
        $this->actingAs($admin);

        $this->assertTrue(UserResource::getDeleteAuthorizationResponse($admin)->denied(), 'self');
        $this->assertTrue(UserResource::getDeleteAuthorizationResponse($other)->allowed());

        $secondAdmin = User::factory()->create();
        $secondAdmin->assignRole('admin');
        $this->assertTrue(UserResource::getDeleteAuthorizationResponse($secondAdmin)->allowed());

        $this->actingAs($other);
        $admin->removeRole('admin');
        $this->assertTrue(UserResource::getDeleteAuthorizationResponse($secondAdmin)->denied(), 'last admin');
    }

    public function test_edit_page_hides_delete_for_the_last_admin_only(): void
    {
        $admin = $this->userWithRole('admin', ['access admin panel', 'view metrics', 'manage users']);
        $target = User::factory()->create();
        $target->assignRole('admin');
        $admin->removeRole('admin');
        $this->actingAs($admin);
        $admin->givePermissionTo('manage users', 'access admin panel');
        Filament::setCurrentPanel('admin');

        $edit = fn (User $record) => Livewire::test(
            EditUser::class,
            ['record' => $record->getKey()],
        );

        $edit($target)->assertActionHidden(DeleteAction::class)->assertFormFieldIsDisabled('roles');
        $edit(User::factory()->create())->assertActionVisible(DeleteAction::class)->assertFormFieldIsEnabled('roles');
    }

    public function test_dashboard_user_widgets_are_hidden_without_manage_users(): void
    {
        $this->actingAs($this->userWithRole('manager', ['access admin panel', 'view metrics']));
        $this->assertFalse(LatestUsersTable::canView());

        $this->actingAs($this->userWithRole('admin', ['access admin panel', 'view metrics', 'manage users']));
        $this->assertTrue(LatestUsersTable::canView());
    }

    public function test_a_category_in_use_cannot_be_deleted_but_an_unused_one_can(): void
    {
        $this->actingAs($this->userWithRole('admin', ['access admin panel', 'view metrics', 'manage users']));
        Filament::setCurrentPanel('admin');
        $used = Category::create(['name' => 'Used', 'type' => 'expense']);
        $unused = Category::create(['name' => 'Unused', 'type' => 'expense']);
        Budget::create(['user_id' => User::factory()->create()->id, 'category_id' => $used->id, 'amount' => 10, 'month' => '2026-10']);

        $this->assertTrue(CategoryResource::getDeleteAuthorizationResponse($used)->denied());
        $this->assertTrue(CategoryResource::getDeleteAuthorizationResponse($unused)->allowed());

        // The model refuses too, so no other code path can cascade-delete user data.
        $this->expectException(LogicException::class);
        $used->delete();
    }
}
