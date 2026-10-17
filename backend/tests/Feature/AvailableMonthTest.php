<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\TokenService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AvailableMonthTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private array $headers;

    private Category $category;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-10-17 12:00:00');
        $this->user = User::factory()->create(['monthly_income' => 1000, 'monthly_expenses' => 600]);
        $this->headers = ['Authorization' => 'Bearer '.TokenService::issue($this->user)];
        $this->category = Category::create(['name' => 'Test', 'type' => 'expense']);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function expense(string $description, float $amount, string $date): void
    {
        $this->user->transactions()->create([
            'category_id' => $this->category->id,
            'description' => $description,
            'amount' => $amount,
            'type' => 'expense',
            'transaction_date' => $date,
        ]);
    }

    private function recurrent(string $description, float $amount, int $day, bool $active = true, string $type = 'expense'): void
    {
        $this->user->recurrentTransactions()->create([
            'category_id' => $this->category->id,
            'description' => $description,
            'amount' => $amount,
            'type' => $type,
            'day_of_month' => $day,
            'is_active' => $active,
        ]);
    }

    public function test_current_month_counts_pending_recurrents_and_skips_copied_ones(): void
    {
        $this->expense('Lunch', 100, '2026-10-10');
        $this->expense('Gym', 20, '2026-10-05');
        $this->recurrent('Gym', 20, 5);       // already copied: not pending, not extrapolated
        $this->recurrent('Rent', 50, 25);     // still due
        $this->recurrent('Old', 99, 28, false); // inactive: ignored

        $this->getJson('/api/financial-records/available', $this->headers)
            ->assertOk()
            ->assertJson([
                'available' => 280,
                'days_remaining' => 14,
                'pending_expenses' => 50,
                'pending_income' => 0,
                'daily_avg_spend' => 5.88,
                'projected_balance' => 147.65,
                'daily_allowance' => 16.43,
            ]);
    }

    public function test_past_month_has_no_days_left_to_project(): void
    {
        $this->expense('Lunch', 100, '2026-09-10');
        $this->recurrent('Rent', 50, 25);

        $this->getJson('/api/financial-records/available?month=2026-09', $this->headers)
            ->assertOk()
            ->assertJson([
                'available' => 300,
                'days_remaining' => 0,
                'pending_expenses' => 0,
                'projected_balance' => 300,
                'daily_allowance' => 0,
            ]);
    }

    public function test_a_future_month_has_every_day_left_and_all_its_recurrents_pending(): void
    {
        $this->recurrent('Rent', 50, 1);
        $this->recurrent('Salary bonus', 30, 5, true, 'income');

        $this->getJson('/api/financial-records/available?month=2026-11', $this->headers)
            ->assertOk()
            ->assertJson([
                'available' => 400,
                'days_remaining' => 30,
                'pending_expenses' => 50,
                'pending_income' => 30,
                'daily_avg_spend' => 0,
                'projected_balance' => 380,
                'daily_allowance' => 12.67,
            ]);
    }

    public function test_a_recurrent_due_today_and_not_copied_is_still_pending_but_day_31_in_a_past_30_day_month_is_not(): void
    {
        $this->recurrent('Today', 20, 17);
        $this->recurrent('Month end', 99, 31);

        $this->getJson('/api/financial-records/available', $this->headers)
            ->assertOk()
            ->assertJson(['pending_expenses' => 119]); // both still ahead in October

        $this->getJson('/api/financial-records/available?month=2026-09', $this->headers)
            ->assertOk()
            ->assertJson(['pending_expenses' => 0]);
    }

    public function test_month_without_transactions_falls_back_to_the_base(): void
    {
        $this->getJson('/api/financial-records/available', $this->headers)
            ->assertOk()
            ->assertJson(['available' => 400, 'daily_avg_spend' => 0, 'projected_balance' => 400]);
    }

    public function test_rejects_a_bad_month_and_anonymous_calls(): void
    {
        $this->getJson('/api/financial-records/available?month=2026-13', $this->headers)->assertStatus(422);
        $this->getJson('/api/financial-records/available')->assertStatus(401);
    }

    public function test_daily_balance_runs_from_the_base_and_stops_after_today(): void
    {
        $this->expense('Lunch', 100, '2026-10-02');
        $this->expense('Old', 40, '2026-09-30');

        $json = $this->getJson('/api/financial-records/daily-balance', $this->headers)->assertOk()->json();

        $this->assertCount(31, $json['current']);
        $this->assertEquals(400, $json['current'][0]);   // base 1000 - 600
        $this->assertEquals(300, $json['current'][1]);   // after the 100 on the 2nd
        $this->assertEquals(300, $json['current'][16]);  // the 17th, today
        $this->assertNull($json['current'][17]);

        $this->assertCount(30, $json['previous']);
        $this->assertEquals(360, $json['previous'][29]); // whole past month, 400 - 40
    }

    public function test_daily_balance_for_a_month_still_to_come_is_empty(): void
    {
        $json = $this->getJson('/api/financial-records/daily-balance?month=2026-12', $this->headers)->assertOk()->json();

        $this->assertSame([null], array_unique($json['current']));
        $this->assertNull($json['previous'][0]); // November has not started either
    }
}
