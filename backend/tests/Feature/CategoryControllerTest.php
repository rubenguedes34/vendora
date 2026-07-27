<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Category;
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
        /** @var User $user */
        $user = User::factory()->create();
        $this->user = $user;
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

    public function test_index_returns_the_shared_category_catalog(): void
    {
        Category::create(['name' => 'Food', 'type' => 'expense']);
        Category::create(['name' => 'Salary', 'type' => 'income']);

        $this->getJson('/api/categories', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(2)
            ->assertJsonPath('0.name', 'Food');
    }

    public function test_store_is_not_available_to_users(): void
    {
        $this->postJson('/api/categories', [
            'name' => 'Food',
            'type' => 'expense',
        ], $this->authHeader())
            ->assertStatus(405);
    }


    public function test_update_is_not_available_to_users(): void
    {
        $cat = Category::create(['name' => 'Old', 'type' => 'expense']);

        $this->putJson("/api/categories/{$cat->id}", [
            'name' => 'New Name',
        ], $this->authHeader())
            ->assertStatus(405);
    }

    public function test_destroy_is_not_available_to_users(): void
    {
        $cat = Category::create(['name' => 'ToDelete', 'type' => 'expense']);

        $this->deleteJson("/api/categories/{$cat->id}", [], $this->authHeader())
            ->assertStatus(405);

        $this->assertDatabaseHas('categories', ['id' => $cat->id]);
    }

    public function test_by_type_returns_filtered_categories(): void
    {
        Category::create(['name' => 'Salary', 'type' => 'income']);
        Category::create(['name' => 'Food', 'type' => 'expense']);

        $this->getJson('/api/categories-by-type/income', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Salary');
    }

    public function test_can_access_a_shared_category(): void
    {
        $cat = Category::create(['name' => 'Shared', 'type' => 'income']);

        $this->getJson("/api/categories/{$cat->id}", $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('name', 'Shared');
    }
}
