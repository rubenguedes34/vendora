<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\StatementAi;
use App\Services\TokenService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class TransactionImportSuggestTest extends TestCase
{
    use RefreshDatabase;

    private function bindAi(?string $reply): void
    {
        $this->app->bind(StatementAi::class, fn () => new class($reply) implements StatementAi
        {
            public function __construct(private ?string $reply) {}

            public function complete(string $instructions, string $prompt): ?string
            {
                return $this->reply;
            }
        });
    }

    private function headersFor(string $role): array
    {
        $this->seed(RoleSeeder::class);
        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole($role);

        return ['Authorization' => 'Bearer '.TokenService::issue($user)];
    }

    public function test_requires_authentication_and_permission(): void
    {
        $payload = ['rows' => [['description' => 'X', 'type' => 'expense']]];

        $this->postJson('/api/transactions/import/suggest', $payload)->assertStatus(401);
        $this->postJson('/api/transactions/import/suggest', $payload, $this->headersFor('user'))->assertStatus(403);
    }

    public function test_returns_suggestions_aligned_with_the_rows(): void
    {
        $food = Category::create(['name' => 'Food', 'type' => 'expense']);
        $this->bindAi("1={$food->id}");

        $this->postJson('/api/transactions/import/suggest', ['rows' => [['description' => 'COMPRA 1 CONTINENTE', 'type' => 'expense']]], $this->headersFor('admin'))
            ->assertOk()
            ->assertJsonPath('available', true)
            ->assertJsonPath('suggestions.0.category_id', $food->id);
    }

    public function test_reports_when_the_ai_is_unavailable_instead_of_failing(): void
    {
        $this->bindAi(null);

        $this->postJson('/api/transactions/import/suggest', ['rows' => [['description' => 'X', 'type' => 'expense']]], $this->headersFor('admin'))
            ->assertOk()
            ->assertJsonPath('available', false)
            ->assertJsonPath('suggestions', []);
    }

    public function test_validates_the_rows(): void
    {
        $headers = $this->headersFor('admin');

        $this->postJson('/api/transactions/import/suggest', ['rows' => []], $headers)->assertStatus(422);
        $this->postJson('/api/transactions/import/suggest', ['rows' => [['description' => 'X', 'type' => 'transfer']]], $headers)->assertStatus(422);
        $this->postJson('/api/transactions/import/suggest', ['rows' => array_fill(0, 101, ['description' => 'X', 'type' => 'expense'])], $headers)->assertStatus(422);
    }

    public function test_only_one_suggestion_runs_per_user_at_a_time(): void
    {
        $this->bindAi('1=1');
        $headers = $this->headersFor('admin');
        $userId = User::latest('id')->first()->id;
        $payload = ['rows' => [['description' => 'X', 'type' => 'expense']]];

        config(['ai.statement.lock_wait' => 0]); // do not wait for the lock in this test
        $lock = Cache::lock("statement-ai:{$userId}", 60);
        $this->assertTrue($lock->get());

        $this->postJson('/api/transactions/import/suggest', $payload, $headers)
            ->assertOk()
            ->assertJsonPath('available', false)
            ->assertJsonPath('busy', true);

        $lock->release();

        $this->postJson('/api/transactions/import/suggest', $payload, $headers)->assertOk()->assertJsonPath('available', true);
    }

    public function test_the_lock_is_released_even_when_the_ai_is_unavailable(): void
    {
        $this->bindAi(null);
        $headers = $this->headersFor('admin');
        $payload = ['rows' => [['description' => 'X', 'type' => 'expense']]];

        $this->postJson('/api/transactions/import/suggest', $payload, $headers)->assertJsonPath('busy', false);
        $this->postJson('/api/transactions/import/suggest', $payload, $headers)->assertJsonPath('busy', false);
    }

    public function test_a_second_request_waits_for_the_first_instead_of_giving_up(): void
    {
        $this->bindAi('1=1');
        $headers = $this->headersFor('admin');
        $userId = User::latest('id')->first()->id;
        config(['ai.statement.lock_wait' => 5]);

        // The lock frees itself after 1 s (as a first request finishing would); the second request must wait and run.
        $lock = Cache::lock("statement-ai:{$userId}", 1);
        $this->assertTrue($lock->get());

        $this->postJson('/api/transactions/import/suggest', ['rows' => [['description' => 'X', 'type' => 'expense']]], $headers)
            ->assertOk()
            ->assertJsonPath('busy', false)
            ->assertJsonPath('available', true);
    }
}
