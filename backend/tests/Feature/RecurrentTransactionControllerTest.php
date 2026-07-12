<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Services\TokenService;

class RecurrentTransactionControllerTest extends TestCase
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
            'name' => 'Rent',
            'type' => 'expense',
        ]);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/recurrent-transactions')->assertStatus(401);
    }

    public function test_index_returns_empty_list_initially(): void
    {
        $this->getJson('/api/recurrent-transactions', $this->authHeader())
            ->assertStatus(200)
            ->assertJson([]);
    }

    public function test_store_creates_recurrent_transaction(): void
    {
        $this->postJson('/api/recurrent-transactions', [
            'description' => 'Rent payment',
            'amount' => 800,
            'type' => 'expense',
            'category_id' => $this->category->id,
            'day_of_month' => 1,
        ], $this->authHeader())
            ->assertStatus(201)
            ->assertJsonPath('description', 'Rent payment')
            ->assertJsonPath('day_of_month', 1);

        $this->assertDatabaseHas('recurrent_transactions', [
            'user_id' => $this->user->id,
            'description' => 'Rent payment',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->postJson('/api/recurrent-transactions', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['description', 'amount', 'type', 'category_id', 'day_of_month']);
    }

    public function test_store_rejects_day_of_month_above_28(): void
    {
        $this->postJson('/api/recurrent-transactions', [
            'description' => 'Test',
            'amount' => 100,
            'type' => 'expense',
            'category_id' => $this->category->id,
            'day_of_month' => 31,
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['day_of_month']);
    }

    public function test_store_rejects_category_belonging_to_another_user(): void
    {
        $other = User::factory()->create();
        $otherCat = $other->categories()->create(['name' => 'Other', 'type' => 'expense']);

        $this->postJson('/api/recurrent-transactions', [
            'description' => 'Hack',
            'amount' => 100,
            'type' => 'expense',
            'category_id' => $otherCat->id,
            'day_of_month' => 5,
        ], $this->authHeader())
            ->assertStatus(403);
    }

    public function test_update_modifies_recurrent_transaction(): void
    {
        $item = $this->user->recurrentTransactions()->create([
            'description' => 'Old',
            'amount' => 100,
            'type' => 'expense',
            'category_id' => $this->category->id,
            'day_of_month' => 5,
        ]);

        $this->putJson("/api/recurrent-transactions/{$item->id}", [
            'description' => 'Updated',
            'amount' => 120,
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('description', 'Updated')
            ->assertJsonPath('amount', 120);
    }

    public function test_destroy_deletes_recurrent_transaction(): void
    {
        $item = $this->user->recurrentTransactions()->create([
            'description' => 'To delete',
            'amount' => 50,
            'type' => 'expense',
            'category_id' => $this->category->id,
            'day_of_month' => 10,
        ]);

        $this->deleteJson("/api/recurrent-transactions/{$item->id}", [], $this->authHeader())
            ->assertStatus(200);

        $this->assertDatabaseMissing('recurrent_transactions', ['id' => $item->id]);
    }

    public function test_copy_to_month_creates_transactions(): void
    {
        $this->user->recurrentTransactions()->create([
            'description' => 'Rent payment',
            'amount' => 800,
            'type' => 'expense',
            'category_id' => $this->category->id,
            'day_of_month' => 1,
        ]);

        $this->postJson('/api/recurrent-transactions/copy', [
            'month' => '2025-08',
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('month', '2025-08');

        $this->assertDatabaseHas('transactions', [
            'user_id' => $this->user->id,
            'description' => 'Rent payment',
        ]);
    }

    public function test_copy_to_month_skips_duplicates(): void
    {
        $this->user->recurrentTransactions()->create([
            'description' => 'Rent payment',
            'amount' => 800,
            'type' => 'expense',
            'category_id' => $this->category->id,
            'day_of_month' => 1,
        ]);

        $this->postJson('/api/recurrent-transactions/copy', ['month' => '2025-08'], $this->authHeader());
        $response = $this->postJson('/api/recurrent-transactions/copy', ['month' => '2025-08'], $this->authHeader());

        $response->assertJsonPath('created', 0);
        $this->assertDatabaseCount('transactions', 1); // still only 1, no duplicate
    }

    public function test_copy_to_month_validates_month_format(): void
    {
        $this->postJson('/api/recurrent-transactions/copy', [
            'month' => 'invalid',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['month']);
    }
}
