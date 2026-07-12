<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Services\TokenService;

class TransactionControllerTest extends TestCase
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
        $this->category = $this->user->categories()->create([
            'name' => 'Salary',
            'type' => 'income',
        ]);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/transactions')
            ->assertStatus(401);
    }

    public function test_index_returns_empty_list_initially(): void
    {
        $this->getJson('/api/transactions', $this->authHeader())
            ->assertStatus(200)
            ->assertJson([]);
    }

    public function test_store_creates_transaction(): void
    {
        $response = $this->postJson('/api/transactions', [
            'category_id' => $this->category->id,
            'description' => 'Monthly salary',
            'amount' => 3000,
            'type' => 'income',
            'transaction_date' => '2025-07-01',
        ], $this->authHeader());

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'description', 'amount', 'type', 'category'])
            ->assertJsonPath('description', 'Monthly salary')
            ->assertJsonPath('amount', '3000.00');

        $this->assertDatabaseHas('transactions', [
            'user_id' => $this->user->id,
            'description' => 'Monthly salary',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->postJson('/api/transactions', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category_id', 'description', 'amount', 'type', 'transaction_date']);
    }

    public function test_store_rejects_category_belonging_to_another_user(): void
    {
        $other = User::factory()->create();
        $otherCategory = $other->categories()->create(['name' => 'Other', 'type' => 'expense']);

        $this->postJson('/api/transactions', [
            'category_id' => $otherCategory->id,
            'description' => 'Hack attempt',
            'amount' => 100,
            'type' => 'expense',
            'transaction_date' => '2025-07-01',
        ], $this->authHeader())
            ->assertStatus(403);
    }

    public function test_update_modifies_transaction(): void
    {
        $tx = $this->user->transactions()->create([
            'category_id' => $this->category->id,
            'description' => 'Old description',
            'amount' => 100,
            'type' => 'income',
            'transaction_date' => '2025-07-01',
        ]);

        $this->putJson("/api/transactions/{$tx->id}", [
            'description' => 'New description',
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('description', 'New description');
    }

    public function test_destroy_deletes_transaction(): void
    {
        $tx = $this->user->transactions()->create([
            'category_id' => $this->category->id,
            'description' => 'To delete',
            'amount' => 50,
            'type' => 'expense',
            'transaction_date' => '2025-07-01',
        ]);

        $this->deleteJson("/api/transactions/{$tx->id}", [], $this->authHeader())
            ->assertStatus(200);

        $this->assertDatabaseMissing('transactions', ['id' => $tx->id]);
    }

    public function test_cannot_access_another_users_transaction(): void
    {
        $other = User::factory()->create();
        $otherCategory = $other->categories()->create(['name' => 'Other', 'type' => 'expense']);
        $tx = $other->transactions()->create([
            'category_id' => $otherCategory->id,
            'description' => 'Private',
            'amount' => 99,
            'type' => 'expense',
            'transaction_date' => '2025-07-01',
        ]);

        $this->getJson("/api/transactions/{$tx->id}", $this->authHeader())
            ->assertStatus(404);
    }
}
