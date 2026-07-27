<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagControllerTest extends TestCase
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

    public function test_tags_require_authentication(): void
    {
        $this->getJson('/api/tags')->assertStatus(401);
    }

    public function test_user_can_manage_own_tags(): void
    {
        $created = $this->postJson('/api/tags', ['name' => 'Work', 'color' => '#123456'], $this->authHeader())
            ->assertStatus(201)
            ->assertJsonPath('name', 'Work');

        $tagId = $created->json('id');

        $this->postJson('/api/tags', ['name' => 'Work', 'color' => '#ffffff'], $this->authHeader())
            ->assertStatus(201)
            ->assertJsonPath('id', $tagId);

        $this->getJson('/api/tags', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(1);

        $this->putJson("/api/tags/{$tagId}", ['name' => 'Client'], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('name', 'Client');

        $this->deleteJson("/api/tags/{$tagId}", [], $this->authHeader())
            ->assertStatus(200);
    }

    public function test_user_cannot_manage_another_users_tag(): void
    {
        $tag = User::factory()->create()->tags()->create(['name' => 'Private', 'color' => '#000000']);

        $this->putJson("/api/tags/{$tag->id}", ['name' => 'Changed'], $this->authHeader())
            ->assertStatus(404);
    }

    public function test_tag_creation_validates_name(): void
    {
        $this->postJson('/api/tags', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }
}
