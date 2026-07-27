<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class InvestmentControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->token = TokenService::issue($this->user);
        $this->user->givePermissionTo(Permission::firstOrCreate([
            'name' => 'view investments',
            'guard_name' => 'web',
        ]));
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Global ETF',
            'type' => 'ETF',
            'account' => 'Brokerage',
            'initial_amount' => 1000,
            'current_amount' => 1200,
            'purchase_date' => '2026-01-15',
        ], $overrides);
    }

    public function test_investments_require_authentication(): void
    {
        $this->getJson('/api/investments')->assertStatus(401);
    }

    public function test_user_with_permission_can_manage_own_investments(): void
    {
        $created = $this->postJson('/api/investments', $this->payload(), $this->authHeader())
            ->assertStatus(201)
            ->assertJsonPath('name', 'Global ETF');

        $investmentId = $created->json('id');

        $this->getJson('/api/investments', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(1);

        $this->putJson("/api/investments/{$investmentId}", ['current_amount' => 1350], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('current_amount', '1350.00');

        $this->deleteJson("/api/investments/{$investmentId}", [], $this->authHeader())
            ->assertStatus(200);

        $this->assertDatabaseMissing('investments', ['id' => $investmentId]);
    }

    public function test_user_cannot_access_another_users_investment(): void
    {
        $other = User::factory()->create();
        $investment = $other->investments()->create($this->payload());

        $this->getJson("/api/investments/{$investment->id}", $this->authHeader())
            ->assertStatus(404);
    }

    public function test_store_validates_required_investment_fields(): void
    {
        $this->postJson('/api/investments', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'type', 'initial_amount', 'current_amount', 'purchase_date']);
    }
}
