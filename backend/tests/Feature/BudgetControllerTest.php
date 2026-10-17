<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private string $token;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        /** @var User $user */
        $user = User::factory()->create();
        $this->user = $user;
        $this->token = TokenService::issue($this->user);
        $this->category = Category::create([
            'name' => 'Groceries',
            'type' => 'expense',
        ]);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer '.$this->token];
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

    public function test_store_accepts_a_global_category(): void
    {
        $category = Category::create(['name' => 'Other', 'type' => 'expense']);

        $this->postJson('/api/budgets', [
            'category_id' => $category->id,
            'amount' => 100,
            'month' => '2025-07',
        ], $this->authHeader())
            ->assertStatus(201);
    }

    public function test_summary_returns_totals(): void
    {
        $income = Category::create(['name' => 'Salary', 'type' => 'income']);
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
        $otherCat = Category::create(['name' => 'Other', 'type' => 'expense']);
        $budget = $other->budgets()->create([
            'category_id' => $otherCat->id,
            'amount' => 100,
            'month' => '2025-07',
        ]);

        $this->deleteJson("/api/budgets/{$budget->id}", [], $this->authHeader())
            ->assertStatus(404);
    }

    public function test_update_cannot_move_budget_to_another_user(): void
    {
        /** @var User $other */
        $other = User::factory()->create();
        $budget = $this->user->budgets()->create([
            'category_id' => $this->category->id,
            'amount' => 100,
            'month' => '2025-07',
        ]);

        $this->putJson("/api/budgets/{$budget->id}", [
            'amount' => 150,
            'user_id' => $other->id,
        ], $this->authHeader())->assertStatus(200);

        $this->assertDatabaseHas('budgets', ['id' => $budget->id, 'user_id' => $this->user->id, 'amount' => 150]);
    }

    public function test_copy_previous_fills_only_empty_categories_and_ignores_other_users(): void
    {
        /** @var User $other */
        $other = User::factory()->create();
        $filled = Category::create(['name' => 'Rent', 'type' => 'expense']);
        $zeroed = Category::create(['name' => 'Fun', 'type' => 'expense']);
        $this->user->budgets()->createMany([
            ['category_id' => $this->category->id, 'amount' => 300, 'month' => '2026-02'],
            ['category_id' => $filled->id, 'amount' => 900, 'month' => '2026-02'],
            ['category_id' => $zeroed->id, 'amount' => 50, 'month' => '2026-02'],
            ['category_id' => $filled->id, 'amount' => 700, 'month' => '2026-03'],
            ['category_id' => $zeroed->id, 'amount' => 0, 'month' => '2026-03'],
        ]);
        $other->budgets()->create(['category_id' => $this->category->id, 'amount' => 999, 'month' => '2026-02']);

        $this->postJson('/api/budgets/copy-previous', ['month' => '2026-03'], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('copied', 2)
            ->assertJsonPath('source_month', '2026-02');

        $mine = $this->user->budgets()->where('month', '2026-03')->pluck('amount', 'category_id');
        $this->assertEquals(300, $mine[$this->category->id]);
        $this->assertEquals(700, $mine[$filled->id]);
        $this->assertEquals(50, $mine[$zeroed->id]);
        $this->assertSame(0, $other->budgets()->where('month', '2026-03')->count());
    }

    public function test_copy_previous_with_nothing_to_copy_returns_zero(): void
    {
        $this->postJson('/api/budgets/copy-previous', ['month' => '2026-03'], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('copied', 0);

        $this->postJson('/api/budgets/copy-previous', ['month' => 'nope'], $this->authHeader())
            ->assertStatus(422);
    }

    public function test_copy_previous_crosses_the_year_boundary(): void
    {
        $this->user->budgets()->create(['category_id' => $this->category->id, 'amount' => 120, 'month' => '2025-12']);

        $this->postJson('/api/budgets/copy-previous', ['month' => '2026-01'], $this->authHeader())
            ->assertJsonPath('copied', 1)
            ->assertJsonPath('source_month', '2025-12');
    }

    public function test_copy_previous_requires_authentication(): void
    {
        $this->postJson('/api/budgets/copy-previous', ['month' => '2026-03'])->assertStatus(401);
    }

    public function test_copy_previous_defaults_to_current_month_when_month_is_null_or_missing(): void
    {
        $this->postJson('/api/budgets/copy-previous', ['month' => null], $this->authHeader())
            ->assertOk()
            ->assertJsonPath('copied', 0);

        $this->postJson('/api/budgets/copy-previous', [], $this->authHeader())->assertOk();
    }

    public function test_copy_previous_is_idempotent_and_takes_the_newest_source_row(): void
    {
        $this->user->budgets()->create(['category_id' => $this->category->id, 'amount' => 100, 'month' => '2026-02']);
        $this->user->budgets()->create(['category_id' => $this->category->id, 'amount' => 250, 'month' => '2026-02']);

        $this->postJson('/api/budgets/copy-previous', ['month' => '2026-03'], $this->authHeader())
            ->assertJsonPath('copied', 1);
        $this->postJson('/api/budgets/copy-previous', ['month' => '2026-03'], $this->authHeader())
            ->assertJsonPath('copied', 0);

        $rows = $this->user->budgets()->where('month', '2026-03')->get();
        $this->assertCount(1, $rows);
        $this->assertEquals(250, $rows->first()->amount);
    }

    public function test_storing_the_same_category_and_month_twice_keeps_one_row(): void
    {
        $payload = ['category_id' => $this->category->id, 'amount' => 250, 'month' => '2026-03'];

        $this->postJson('/api/budgets', $payload, $this->authHeader())->assertStatus(201);
        $this->postJson('/api/budgets', ['amount' => 300] + $payload, $this->authHeader())->assertStatus(201);

        $rows = $this->user->budgets()->where('month', '2026-03')->get();
        $this->assertCount(1, $rows);
        $this->assertEquals(300, $rows->first()->amount);
    }
}
