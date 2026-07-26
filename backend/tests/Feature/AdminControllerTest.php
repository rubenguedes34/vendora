<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $user;
    private string $adminToken;
    private string $userToken;

    protected function setUp(): void
    {
        parent::setUp();

        Permission::firstOrCreate(['name' => 'access admin panel', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'manage users', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'view metrics', 'guard_name' => 'web']);

        /** @var Role $adminRole */
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $adminRole->syncPermissions(['access admin panel', 'manage users', 'view metrics']);

        Role::firstOrCreate(['name' => 'user', 'guard_name' => 'web']);

        /** @var User $admin */
        $admin = User::factory()->create(['email' => 'admin@vendora.com']);
        $admin->assignRole('admin');
        $this->admin = $admin;
        $this->adminToken = TokenService::issue($admin);

        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole('user');
        $this->user = $user;
        $this->userToken = TokenService::issue($user);
    }

    private function authHeader(string $token): array
    {
        return ['Authorization' => 'Bearer ' . $token];
    }

    public function test_dashboard_metrics_requires_admin_or_manager_role(): void
    {
        $this->getJson('/api/admin/dashboard-metrics', $this->authHeader($this->userToken))
            ->assertStatus(403);

        $this->getJson('/api/admin/dashboard-metrics', $this->authHeader($this->adminToken))
            ->assertStatus(200)
            ->assertJsonStructure(['total_users', 'active_users', 'blacklisted_users']);
    }

    public function test_users_list_is_paginated_and_searchable(): void
    {
        $response = $this->getJson('/api/admin/users?search=' . urlencode($this->user->email), $this->authHeader($this->adminToken));
        $response->assertStatus(200)
            ->assertJsonPath('data.0.email', $this->user->email);
    }

    public function test_admin_can_change_user_role(): void
    {
        $this->patchJson('/api/admin/users/' . $this->user->id . '/role', ['role' => 'manager'], $this->authHeader($this->adminToken))
            ->assertStatus(200);

        $this->assertTrue($this->user->fresh()->hasRole('manager'));
    }

    public function test_admin_can_toggle_blacklist(): void
    {
        $this->patchJson('/api/admin/users/' . $this->user->id . '/blacklist', [], $this->authHeader($this->adminToken))
            ->assertStatus(200);

        $this->assertNotNull($this->user->fresh()->blacklisted_at);
    }

    public function test_admin_can_delete_user(): void
    {
        $this->deleteJson('/api/admin/users/' . $this->user->id, [], $this->authHeader($this->adminToken))
            ->assertStatus(200);

        $this->assertModelMissing($this->user);
    }

    public function test_admin_cannot_delete_self(): void
    {
        $this->deleteJson('/api/admin/users/' . $this->admin->id, [], $this->authHeader($this->adminToken))
            ->assertStatus(422);
    }
}
