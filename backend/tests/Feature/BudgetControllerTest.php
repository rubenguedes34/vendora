<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Services\TokenService;

class BudgetControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;
    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->token = TokenService::issue($this->user);
        $this->category = $this->user->categories()->create([
            'name' => 'Groceries',
            'type' => 'expense',
        ]);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/budgets')->assertStatus(401);
    }

    public function test_index_returns_budgets_for_current_month(): void
    {
        $this->user->budgets()->create([
            'category_id' => $this->category->id,
            'amount' => 500,
            'month' => date('Y-m'),
        ]);

        $this->getJson('/api/budgets', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_store_creates_budget(): void
    {
        $this->postJson('/api/budgets', [
            'category_id' => $this->category->id,
            'amount' => 300,
            'month' => '2025-07',
        ], $this->authHeader())
            ->assertStatus(201)
            ->assertJsonPath('amount', '300.00');

        $this->assertDatabaseHas('budgets', [
            'user_id' => $this->user->id,
            'amount' => 300,
            'month' => '2025-07',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->postJson('/api/budgets', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category_id', 'amount', 'month']);
    }

    public function test_store_rejects_category_belonging_to_another_user(): void
    {
        $other = User::factory()->create();
        $otherCat = $other->categories()->create(['name' => 'Other', 'type' => 'expense']);

        $this->postJson('/api/budgets', [
            'category_id' => $otherCat->id,
            'amount' => 100,
            'month' => '2025-07',
        ], $this->authHeader())
            ->assertStatus(403);
    }

    public function test_summary_returns_totals(): void
    {
        $income = $this->user->categories()->create(['name' => 'Salary', 'type' => 'income']);
        $this->user->budgets()->create(['category_id' => $income->id, 'amount' => 4000, 'month' => '2025-07']);
        $this->user->budgets()->create(['category_id' => $this->category->id, 'amount' => 500, 'month' => '2025-07']);

        $this->getJson('/api/budgets/summary/2025-07', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonStructure(['month', 'income', 'expenses', 'savings', 'balance']);
    }

    public function test_destroy_deletes_budget(): void
    {
        $budget = $this->user->budgets()->create([
            'category_id' => $this->category->id,
            'amount' => 200,
            'month' => '2025-07',
        ]);

        $this->deleteJson("/api/budgets/{$budget->id}", [], $this->authHeader())
            ->assertStatus(200);

        $this->assertDatabaseMissing('budgets', ['id' => $budget->id]);
    }

    public function test_cannot_delete_another_users_budget(): void
    {
        $other = User::factory()->create();
        $otherCat = $other->categories()->create(['name' => 'Other', 'type' => 'expense']);
        $budget = $other->budgets()->create([
            'category_id' => $otherCat->id,
            'amount' => 100,
            'month' => '2025-07',
        ]);

        $this->deleteJson("/api/budgets/{$budget->id}", [], $this->authHeader())
            ->assertStatus(404);
    }
}
