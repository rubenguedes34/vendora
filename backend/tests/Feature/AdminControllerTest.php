<?php

namespace Tests\Feature;

use App\Models\Investment;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Ai\Models\Conversation;
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

    public function test_manager_can_view_metrics_but_not_manage_users(): void
    {
        /** @var Role $managerRole */
        $managerRole = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $managerRole->syncPermissions(['access admin panel', 'view metrics']);

        /** @var User $manager */
        $manager = User::factory()->create();
        $manager->assignRole('manager');
        $header = $this->authHeader(TokenService::issue($manager));

        $this->getJson('/api/admin/dashboard-metrics', $header)->assertStatus(200);
        $this->getJson('/api/admin/users', $header)->assertStatus(403);
        $this->patchJson('/api/admin/users/' . $this->user->id . '/role', ['role' => 'admin'], $header)->assertStatus(403);
        $this->patchJson('/api/admin/users/' . $this->admin->id . '/blacklist', [], $header)->assertStatus(403);
        $this->deleteJson('/api/admin/users/' . $this->admin->id, [], $header)->assertStatus(403);

        $this->assertFalse($this->user->fresh()->hasRole('admin'));
    }

    public function test_blacklisting_a_user_revokes_their_tokens(): void
    {
        $this->patchJson('/api/admin/users/' . $this->user->id . '/blacklist', [], $this->authHeader($this->adminToken))
            ->assertStatus(200);

        $this->assertSame(0, $this->user->tokens()->count());
    }

    public function test_metrics_endpoints_respond(): void
    {
        foreach (['budgets-metrics', 'investments-metrics', 'transactions-metrics'] as $endpoint) {
            $this->getJson('/api/admin/' . $endpoint . '?year=2025&search=a', $this->authHeader($this->adminToken))
                ->assertStatus(200);
        }
    }

    public function test_view_metrics_alone_gets_aggregates_without_other_users_rows(): void
    {
        $manager = User::factory()->create();
        Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web'])
            ->syncPermissions(['access admin panel', 'view metrics']);
        $manager->assignRole('manager');
        $managerToken = TokenService::issue($manager);

        Investment::create([
            'user_id' => $this->user->id,
            'name' => 'Secret ETF',
            'type' => 'etf',
            'initial_amount' => 100,
            'current_amount' => 120,
            'purchase_date' => '2025-01-15',
        ]);

        $managerView = $this->getJson('/api/admin/investments-metrics?search=' . $this->user->email, $this->authHeader($managerToken))
            ->assertStatus(200);
        $this->assertNull($managerView->json('investments'));
        $this->assertNotNull($managerView->json('summary'));
        $this->assertStringNotContainsString($this->user->email, $managerView->getContent());

        $this->getJson('/api/admin/transactions-metrics', $this->authHeader($managerToken))
            ->assertStatus(200)
            ->assertJsonPath('transactions', null);

        // Free-text search is ignored for view-metrics-only callers, so it cannot probe other users.
        $unfiltered = $this->getJson('/api/admin/investments-metrics', $this->authHeader($managerToken))->json('summary.count');
        $this->getJson('/api/admin/investments-metrics?search=nothing-matches-this', $this->authHeader($managerToken))
            ->assertJsonPath('summary.count', $unfiltered);
        $this->getJson('/api/admin/budgets-metrics?search=' . $this->user->email, $this->authHeader($managerToken))
            ->assertStatus(200);

        $adminView = $this->getJson('/api/admin/investments-metrics', $this->authHeader($this->adminToken))
            ->assertStatus(200)
            ->assertJsonPath('investments.data.0.user.email', $this->user->email);
        $this->assertSame('Secret ETF', $adminView->json('investments.data.0.name'));
    }

    public function test_destroying_a_user_removes_their_ai_conversations(): void
    {
        $id = (string) Str::uuid();
        DB::table('agent_conversations')->insert([
            'id' => $id,
            'participant_type' => Conversation::participantType($this->user),
            'participant_id' => Conversation::participantKey($this->user),
            'title' => 'Hi',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->deleteJson('/api/admin/users/' . $this->user->id, [], $this->authHeader($this->adminToken))
            ->assertStatus(200);

        $this->assertDatabaseMissing('agent_conversations', ['id' => $id]);
    }

    public function test_admin_panel_link_signs_the_admin_into_the_panel_once(): void
    {
        $url = $this->postJson('/api/admin/panel-link', [], $this->authHeader($this->adminToken))
            ->assertStatus(200)
            ->json('url');

        $path = parse_url($url, PHP_URL_PATH) . '?' . parse_url($url, PHP_URL_QUERY);

        $this->get($path)->assertRedirect('/admin');
        $this->assertAuthenticatedAs($this->admin, 'web');

        // The link is single use.
        auth('web')->logout();
        $this->get($path)->assertRedirect(route('filament.admin.auth.login'));
        $this->assertGuest('web');
    }

    public function test_regular_user_cannot_get_an_admin_panel_link(): void
    {
        $this->postJson('/api/admin/panel-link', [], $this->authHeader($this->userToken))->assertStatus(403);
    }

    public function test_admin_panel_entry_rejects_an_unknown_code(): void
    {
        $this->get('/auth/admin-panel?code=' . str_repeat('a', 64))
            ->assertRedirect(route('filament.admin.auth.login'));
        $this->assertGuest('web');
    }
}
