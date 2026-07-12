<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Services\TokenService;

class CategoryControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->token = TokenService::issue($this->user);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/categories')->assertStatus(401);
    }

    public function test_index_returns_only_own_categories(): void
    {
        $this->user->categories()->create(['name' => 'Mine', 'type' => 'expense']);

        $other = User::factory()->create();
        $other->categories()->create(['name' => 'Theirs', 'type' => 'income']);

        $this->getJson('/api/categories', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Mine');
    }

    public function test_store_creates_category(): void
    {
        $this->postJson('/api/categories', [
            'name' => 'Food',
            'type' => 'expense',
            'icon' => '🍔',
            'color' => '#ff0000',
        ], $this->authHeader())
            ->assertStatus(201)
            ->assertJsonPath('name', 'Food')
            ->assertJsonPath('type', 'expense');

        $this->assertDatabaseHas('categories', [
            'user_id' => $this->user->id,
            'name' => 'Food',
        ]);
    }

    public function test_store_validates_required_fields(): void
    {
        $this->postJson('/api/categories', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'type']);
    }

    public function test_store_rejects_invalid_type(): void
    {
        $this->postJson('/api/categories', [
            'name' => 'Bad',
            'type' => 'invalid',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['type']);
    }

    public function test_update_modifies_category(): void
    {
        $cat = $this->user->categories()->create(['name' => 'Old', 'type' => 'expense']);

        $this->putJson("/api/categories/{$cat->id}", [
            'name' => 'New Name',
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('name', 'New Name');
    }

    public function test_destroy_deletes_category(): void
    {
        $cat = $this->user->categories()->create(['name' => 'ToDelete', 'type' => 'expense']);

        $this->deleteJson("/api/categories/{$cat->id}", [], $this->authHeader())
            ->assertStatus(200);

        $this->assertDatabaseMissing('categories', ['id' => $cat->id]);
    }

    public function test_by_type_returns_filtered_categories(): void
    {
        $this->user->categories()->create(['name' => 'Salary', 'type' => 'income']);
        $this->user->categories()->create(['name' => 'Food', 'type' => 'expense']);

        $this->getJson('/api/categories-by-type/income', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Salary');
    }

    public function test_cannot_access_another_users_category(): void
    {
        $other = User::factory()->create();
        $cat = $other->categories()->create(['name' => 'Private', 'type' => 'income']);

        $this->getJson("/api/categories/{$cat->id}", $this->authHeader())
            ->assertStatus(404);
    }
}
