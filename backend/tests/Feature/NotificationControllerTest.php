<?php

namespace Tests\Feature;

use App\Models\Budget;
use App\Models\Category;
use App\Models\Notification;
use App\Models\User;
use App\Services\TokenService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
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

    public function test_notifications_require_authentication(): void
    {
        $this->getJson('/api/notifications')->assertStatus(401);
    }

    public function test_user_can_read_mark_and_delete_own_notifications(): void
    {
        $unread = $this->user->appNotifications()->create([
            'type' => 'test',
            'title' => 'Unread',
            'body' => 'Body',
            'data' => ['key' => 'unread'],
        ]);
        $read = $this->user->appNotifications()->create([
            'type' => 'test',
            'title' => 'Read',
            'body' => 'Body',
            'data' => ['key' => 'read'],
            'is_read' => true,
        ]);

        $this->getJson('/api/notifications?unread_only=true', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $unread->id]);

        $countResponse = $this->getJson('/api/notifications/unread-count', $this->authHeader())
            ->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $countResponse->json('count'));

        $this->patchJson("/api/notifications/{$unread->id}/read", [], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('is_read', true);

        $this->patchJson('/api/notifications/read-all', [], $this->authHeader())
            ->assertStatus(200);

        $this->deleteJson("/api/notifications/{$read->id}", [], $this->authHeader())
            ->assertStatus(200);
    }

    public function test_generated_notifications_carry_a_translation_key_with_english_fallback(): void
    {
        $list = $this->getJson('/api/notifications', $this->authHeader())->assertStatus(200)->json();

        $report = collect($list)->firstWhere('type', 'monthly_report_ready');
        $this->assertNotNull($report);
        $this->assertSame('Monthly report ready', $report['title']);
        $this->assertSame('monthly_report_ready', $report['data']['i18n']['key']);
        $this->assertSame(now()->subMonthNoOverflow()->format('Y-m'), $report['data']['i18n']['params']['month']);
    }

    public function test_deleted_notification_is_not_generated_again(): void
    {
        $list = $this->getJson('/api/notifications', $this->authHeader())->json();
        $this->assertNotEmpty($list);
        $id = $list[0]['id'];

        $this->deleteJson("/api/notifications/{$id}", [], $this->authHeader())->assertStatus(200);

        // Clearing the cache forces the generator to run again, as when its TTL expires.
        Cache::flush();

        $this->getJson('/api/notifications', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonMissing(['id' => $id])
            ->assertJsonCount(count($list) - 1);
    }

    public function test_unread_count_generates_notifications_before_the_list_is_opened(): void
    {
        $this->getJson('/api/notifications/unread-count', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('count', fn ($count) => $count >= 1);
    }

    private function makeRent(): Category
    {
        $category = Category::create(['name' => 'Rent', 'type' => 'expense']);
        $this->user->recurrentTransactions()->create([
            'description' => 'Monthly rent',
            'amount' => 500,
            'type' => 'expense',
            'category_id' => $category->id,
            'day_of_month' => 5,
            'is_active' => true,
        ]);

        return $category;
    }

    public function test_recurring_transaction_due_earlier_this_month_is_notified_once(): void
    {
        $this->travelTo(Carbon::parse('2026-03-01 09:00'));
        $this->makeRent();

        $this->travelTo(Carbon::parse('2026-03-10 09:00'));
        $this->getJson('/api/notifications', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonFragment(['type' => 'recurring_due', 'body' => 'Monthly rent was due on Mar 5.']);

        Cache::flush();
        $this->getJson('/api/notifications', $this->authHeader());
        $this->assertSame(1, Notification::where('type', 'recurring_due')->count());
    }

    public function test_recurring_transaction_created_after_its_due_date_is_not_notified(): void
    {
        $this->travelTo(Carbon::parse('2026-03-10 09:00'));
        $this->makeRent();

        $this->getJson('/api/notifications', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonMissing(['type' => 'recurring_due']);
    }

    public function test_almost_exceeded_budget_notification_returns_when_spending_drops_back(): void
    {
        $category = Category::create(['name' => 'Food', 'type' => 'expense']);
        Budget::create([
            'user_id' => $this->user->id,
            'category_id' => $category->id,
            'amount' => 100,
            'month' => now()->format('Y-m'),
        ]);
        $spend = fn (float $amount) => $this->user->transactions()->create([
            'category_id' => $category->id,
            'description' => 'Groceries',
            'amount' => $amount,
            'type' => 'expense',
            'transaction_date' => now()->toDateString(),
        ]);

        $spend(85);
        $this->getJson('/api/notifications', $this->authHeader())
            ->assertJsonFragment(['type' => 'budget_almost_exceeded']);

        $extra = $spend(30);
        Cache::flush();
        $this->getJson('/api/notifications', $this->authHeader())
            ->assertJsonFragment(['type' => 'budget_exceeded'])
            ->assertJsonMissing(['type' => 'budget_almost_exceeded']);

        $extra->delete();
        Cache::flush();
        $this->getJson('/api/notifications', $this->authHeader())
            ->assertJsonFragment(['type' => 'budget_almost_exceeded']);
    }

    public function test_old_deleted_notifications_are_purged_but_recent_ones_are_kept(): void
    {
        $old = $this->user->appNotifications()->create(['type' => 'test', 'title' => 'Old', 'data' => ['key' => 'old']]);
        $recent = $this->user->appNotifications()->create(['type' => 'test', 'title' => 'Recent', 'data' => ['key' => 'recent']]);
        $old->delete();
        $recent->delete();
        Notification::withTrashed()->whereKey($old->id)->update(['deleted_at' => now()->subDays(61)]);

        $this->getJson('/api/notifications', $this->authHeader())->assertStatus(200);

        $this->assertNull(Notification::withTrashed()->find($old->id));
        $this->assertNotNull(Notification::withTrashed()->find($recent->id));
    }

    public function test_user_cannot_manage_another_users_notification(): void
    {
        $notification = User::factory()->create()->appNotifications()->create([
            'type' => 'test',
            'title' => 'Private',
            'data' => ['key' => 'private'],
        ]);

        $this->deleteJson("/api/notifications/{$notification->id}", [], $this->authHeader())
            ->assertStatus(404);
    }
}
