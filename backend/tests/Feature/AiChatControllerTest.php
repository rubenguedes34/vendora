<?php

namespace Tests\Feature;

use App\Models\Faq;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AiChatControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('ai.providers.openai.key', '');

        $this->user = User::factory()->create();
        $this->token = TokenService::issue($this->user);
        $this->user->givePermissionTo(Permission::firstOrCreate([
            'name' => 'use ai support',
            'guard_name' => 'web',
        ]));
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_ai_routes_require_authentication_and_permission(): void
    {
        $this->postJson('/api/ai/chat', ['message' => 'Hello'])->assertStatus(401);

        $token = TokenService::issue(User::factory()->create());
        $this->getJson('/api/ai/faqs', ['Authorization' => 'Bearer ' . $token])
            ->assertStatus(403);
    }

    public function test_faq_endpoint_returns_application_faqs(): void
    {
        Faq::create([
            'question' => 'How do budgets work?',
            'answer' => 'Set a monthly limit.',
            'keywords' => ['budget', 'limit'],
        ]);

        $this->getJson('/api/ai/faqs', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonFragment(['question' => 'How do budgets work?']);
    }

    public function test_chat_uses_local_faq_response_without_openai_key(): void
    {
        Faq::create([
            'question' => 'How do budgets work?',
            'answer' => 'Set a monthly limit.',
            'keywords' => ['budget', 'limit'],
        ]);

        $response = $this->postJson('/api/ai/chat', ['message' => 'How do I set a budget?'], $this->authHeader())
            ->assertStatus(200);

        $this->assertStringContainsString('Live AI is not configured', $response->json('message'));
    }

    public function test_chat_validates_message(): void
    {
        $this->postJson('/api/ai/chat', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['message']);
    }
}
