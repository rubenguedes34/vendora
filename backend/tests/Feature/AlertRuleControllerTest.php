<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class AlertRuleControllerTest extends TestCase
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
        return ['Authorization' => 'Bearer '.$this->token];
    }

    private function spend(Category $category, float $amount): void
    {
        $this->user->transactions()->create([
            'category_id' => $category->id,
            'type' => 'expense',
            'amount' => $amount,
            'transaction_date' => now()->toDateString(),
            'description' => 'Test',
        ]);
    }

    public function test_alert_rules_require_authentication(): void
    {
        $this->getJson('/api/alert-rules')->assertStatus(401);
    }

    public function test_user_can_create_list_update_and_delete_a_rule(): void
    {
        $category = Category::create(['name' => 'Cat1', 'type' => 'expense']);

        $id = $this->postJson('/api/alert-rules', [
            'type' => 'category_limit',
            'category_id' => $category->id,
            'threshold' => 200,
        ], $this->authHeader())
            ->assertStatus(201)
            ->assertJsonPath('is_active', true)
            ->json('id');

        $this->getJson('/api/alert-rules', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $id);

        $this->putJson("/api/alert-rules/{$id}", ['threshold' => 300, 'is_active' => false], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('threshold', '300.00')
            ->assertJsonPath('is_active', false);

        $this->deleteJson("/api/alert-rules/{$id}", [], $this->authHeader())->assertStatus(200);
        $this->assertDatabaseMissing('alert_rules', ['id' => $id]);
    }

    public function test_validation_rejects_bad_rules(): void
    {
        $category = Category::create(['name' => 'Cat2', 'type' => 'expense']);

        // category_limit needs a category
        $this->postJson('/api/alert-rules', ['type' => 'category_limit', 'threshold' => 100], $this->authHeader())
            ->assertStatus(422)->assertJsonValidationErrors('category_id');

        // total_spend_limit must not carry one
        $this->postJson('/api/alert-rules', ['type' => 'total_spend_limit', 'category_id' => $category->id, 'threshold' => 100], $this->authHeader())
            ->assertStatus(422)->assertJsonValidationErrors('category_id');

        // threshold must be positive
        $this->postJson('/api/alert-rules', ['type' => 'total_spend_limit', 'threshold' => 0], $this->authHeader())
            ->assertStatus(422)->assertJsonValidationErrors('threshold');

        $this->postJson('/api/alert-rules', ['type' => 'nonsense', 'threshold' => 10], $this->authHeader())
            ->assertStatus(422)->assertJsonValidationErrors('type');
    }

    public function test_user_cannot_touch_another_users_rule(): void
    {
        $other = User::factory()->create();
        $rule = $other->alertRules()->create(['type' => 'total_spend_limit', 'threshold' => 100]);

        $this->putJson("/api/alert-rules/{$rule->id}", ['threshold' => 5], $this->authHeader())->assertStatus(404);
        $this->deleteJson("/api/alert-rules/{$rule->id}", [], $this->authHeader())->assertStatus(404);
        $this->assertDatabaseHas('alert_rules', ['id' => $rule->id, 'threshold' => 100]);
    }

    public function test_category_rule_notifies_once_when_spending_reaches_the_limit(): void
    {
        Cache::flush();
        $category = Category::create(['name' => 'Groceries', 'type' => 'expense']);
        $this->user->alertRules()->create(['type' => 'category_limit', 'category_id' => $category->id, 'threshold' => 100]);

        $this->spend($category, 60);
        $this->getJson('/api/notifications', $this->authHeader())
            ->assertJsonMissing(['type' => 'alert_rule_triggered']);

        $this->spend($category, 50);
        Cache::flush();
        $this->getJson('/api/notifications', $this->authHeader())
            ->assertJsonFragment(['type' => 'alert_rule_triggered']);

        Cache::flush();
        $this->getJson('/api/notifications', $this->authHeader());
        $this->assertSame(1, $this->user->appNotifications()->where('type', 'alert_rule_triggered')->count());
    }

    public function test_total_rule_counts_all_categories_and_inactive_rules_are_ignored(): void
    {
        Cache::flush();
        $a = Category::create(['name' => 'Cat3', 'type' => 'expense']);
        $b = Category::create(['name' => 'Cat4', 'type' => 'expense']);
        $this->spend($a, 70);
        $this->spend($b, 40);

        $inactive = $this->user->alertRules()->create(['type' => 'total_spend_limit', 'threshold' => 50, 'is_active' => false]);
        $this->getJson('/api/notifications', $this->authHeader());
        $this->assertSame(0, $this->user->appNotifications()->where('type', 'alert_rule_triggered')->count());

        $inactive->update(['is_active' => true]);
        Cache::flush();
        $this->getJson('/api/notifications', $this->authHeader());
        $this->assertSame(1, $this->user->appNotifications()->where('type', 'alert_rule_triggered')->count());
    }

    public function test_deleted_rule_notification_is_not_regenerated(): void
    {
        Cache::flush();
        $category = Category::create(['name' => 'Cat5', 'type' => 'expense']);
        $this->user->alertRules()->create(['type' => 'category_limit', 'category_id' => $category->id, 'threshold' => 10]);
        $this->spend($category, 20);

        $id = $this->getJson('/api/notifications', $this->authHeader())
            ->assertJsonFragment(['type' => 'alert_rule_triggered'])
            ->collect()->firstWhere('type', 'alert_rule_triggered')['id'];

        $this->deleteJson("/api/notifications/{$id}", [], $this->authHeader())->assertStatus(200);

        Cache::flush();
        $this->getJson('/api/notifications', $this->authHeader())
            ->assertJsonMissing(['type' => 'alert_rule_triggered']);
    }

    public function test_threshold_must_be_at_least_one_cent_with_two_decimals(): void
    {
        foreach ([0.001, 10.555, 0] as $bad) {
            $this->postJson('/api/alert-rules', ['type' => 'total_spend_limit', 'threshold' => $bad], $this->authHeader())
                ->assertStatus(422)->assertJsonValidationErrors('threshold');
        }
    }

    public function test_category_rule_requires_an_expense_category(): void
    {
        $income = Category::create(['name' => 'Salary', 'type' => 'income']);

        $this->postJson('/api/alert-rules', ['type' => 'category_limit', 'category_id' => $income->id, 'threshold' => 10], $this->authHeader())
            ->assertStatus(422)->assertJsonValidationErrors('category_id');
    }

    public function test_changing_the_limit_can_alert_again_and_deleting_the_rule_keeps_past_notifications(): void
    {
        Cache::flush();
        $category = Category::create(['name' => 'Fun', 'type' => 'expense']);
        $rule = $this->user->alertRules()->create(['type' => 'category_limit', 'category_id' => $category->id, 'threshold' => 10]);
        $this->spend($category, 20);

        $this->getJson('/api/notifications', $this->authHeader());
        $this->assertSame(1, $this->user->appNotifications()->where('type', 'alert_rule_triggered')->count());

        // A new limit that is also reached is a different alert for the same month.
        $this->putJson("/api/alert-rules/{$rule->id}", ['threshold' => 15], $this->authHeader())->assertStatus(200);
        $this->getJson('/api/notifications', $this->authHeader());
        $this->assertSame(2, $this->user->appNotifications()->where('type', 'alert_rule_triggered')->count());

        $this->deleteJson("/api/alert-rules/{$rule->id}", [], $this->authHeader())->assertStatus(200);
        $this->assertSame(2, $this->user->appNotifications()->where('type', 'alert_rule_triggered')->count());
    }
}
