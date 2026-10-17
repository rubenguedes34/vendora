<?php

namespace Tests\Feature;

use App\Ai\Agents\SupportAgent;
use App\Models\Faq;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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
        config()->set('ai.support.provider', 'none');

        $this->user = User::factory()->create();
        $this->token = TokenService::issue($this->user);
        $this->user->givePermissionTo(Permission::firstOrCreate([
            'name' => 'use ai support',
            'guard_name' => 'web',
        ]));
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer '.$this->token];
    }

    public function test_ai_routes_require_authentication_and_permission(): void
    {
        $this->postJson('/api/ai/chat', ['message' => 'Hello'])->assertStatus(401);

        $token = TokenService::issue(User::factory()->create());
        $this->getJson('/api/ai/faqs', ['Authorization' => 'Bearer '.$token])
            ->assertStatus(403);
    }

    public function test_chat_limiter_has_a_per_minute_and_a_per_day_cap_keyed_by_user(): void
    {
        config()->set('ai.support.daily_limit', 25);

        $request = Request::create('/api/ai/chat', 'POST');
        $request->setUserResolver(fn () => $this->user);

        $limits = collect(RateLimiter::limiter('ai')($request))
            ->mapWithKeys(fn ($limit) => [$limit->decaySeconds => $limit]);

        $this->assertSame(10, $limits[60]->maxAttempts);
        $this->assertSame(25, $limits[86400]->maxAttempts);
        $this->assertSame((string) $this->user->id, (string) $limits[60]->key);
        $this->assertNotSame($limits[60]->key, $limits[86400]->key);
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

    public function test_faqs_use_pt_translation_when_available_else_english(): void
    {
        Faq::create(['question' => 'Q1', 'answer' => 'A1', 'question_pt' => 'P1', 'answer_pt' => 'R1', 'keywords' => ['a']]);
        Faq::create(['question' => 'Q2', 'answer' => 'A2', 'keywords' => ['b']]);

        $this->getJson('/api/ai/faqs', $this->authHeader() + ['Accept-Language' => 'pt-PT'])
            ->assertJsonFragment(['question' => 'P1', 'answer' => 'R1'])
            ->assertJsonFragment(['question' => 'Q2', 'answer' => 'A2']);

        $this->getJson('/api/ai/faqs', $this->authHeader())
            ->assertJsonFragment(['question' => 'Q1']);
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

        $this->assertStringContainsString('limit', $response->json('message'));
        $this->assertStringNotContainsString('not configured', $response->json('message'));
    }

    public function test_conversations_are_saved_listed_continued_and_deleted_per_user(): void
    {
        config()->set('ai.support.provider', 'openai');
        config()->set('ai.support.models', ['test-model']);
        SupportAgent::fake(['Budgets set monthly limits.', 'Yes, per category.', 'Another answer.']);

        $first = $this->postJson('/api/ai/chat', ['message' => 'How do budgets work?'], $this->authHeader())
            ->assertStatus(200)
            ->assertJson(['message' => 'Budgets set monthly limits.'])
            ->json('conversation_id');
        $this->assertNotEmpty($first);

        // Continuing keeps the same conversation; omitting the id starts a new one.
        $this->postJson('/api/ai/chat', ['message' => 'Per category?', 'conversation_id' => $first], $this->authHeader())
            ->assertJson(['conversation_id' => $first]);
        $second = $this->postJson('/api/ai/chat', ['message' => 'Something else'], $this->authHeader())
            ->json('conversation_id');
        $this->assertNotSame($first, $second);

        $this->getJson('/api/ai/conversations', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $first, 'title' => 'How do budgets work?']);

        $this->getJson('/api/ai/conversations/'.$first, $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(4, 'data')
            ->assertJsonPath('data.0', ['role' => 'user', 'text' => 'How do budgets work?']);

        // Another user cannot see, continue or delete it.
        $other = ['Authorization' => 'Bearer '.TokenService::issue(User::factory()->create()->givePermissionTo('use ai support'))];
        $this->getJson('/api/ai/conversations', $other)->assertJson(['data' => []]);
        $this->getJson('/api/ai/conversations/'.$first, $other)->assertStatus(404);
        $this->postJson('/api/ai/chat', ['message' => 'hi', 'conversation_id' => $first], $other)->assertStatus(404);
        $this->deleteJson('/api/ai/conversations/'.$first, [], $other)->assertStatus(404);

        $this->deleteJson('/api/ai/conversations/'.$first, [], $this->authHeader())->assertStatus(200);
        $this->getJson('/api/ai/conversations', $this->authHeader())->assertJsonCount(1, 'data');
    }

    public function test_faq_keywords_with_slash_or_capitals_still_match(): void
    {
        Faq::query()->delete();
        Faq::create([
            'question' => 'Income or expense?',
            'answer' => 'Pick the transaction type.',
            'keywords' => ['Income/Expense'],
        ]);

        $response = $this->postJson('/api/ai/chat', ['message' => 'What is an income/expense entry?'], $this->authHeader())
            ->assertStatus(200);

        $this->assertStringContainsString('Pick the transaction type.', $response->json('message'));
    }

    public function test_faq_without_keywords_never_matches(): void
    {
        Faq::query()->delete();
        Faq::create(['question' => 'Empty keywords', 'answer' => 'Should never be returned.', 'keywords' => []]);

        $response = $this->postJson('/api/ai/chat', ['message' => 'qwertyuiop'], $this->authHeader())
            ->assertStatus(200);

        $this->assertStringNotContainsString('Should never be returned.', $response->json('message'));
    }

    public function test_conversation_id_must_be_a_uuid(): void
    {
        $this->postJson('/api/ai/chat', ['message' => 'hi', 'conversation_id' => 'not-a-uuid'], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['conversation_id']);
    }

    public function test_chat_validates_message(): void
    {
        $this->postJson('/api/ai/chat', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['message']);
    }

    public function test_agent_instructions_ask_for_european_portuguese_only_in_pt(): void
    {
        $this->assertStringNotContainsString('European Portuguese', (new SupportAgent)->instructions());

        app()->setLocale('pt');

        $this->assertStringContainsString('European Portuguese', (new SupportAgent)->instructions());
    }
}
