<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\TokenService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthComparisonTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private array $headers;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-01-17 12:00:00');
        $this->user = User::factory()->create(['monthly_income' => 1000, 'monthly_expenses' => 600]);
        $this->headers = ['Authorization' => 'Bearer '.TokenService::issue($this->user)];
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function expense(string $category, float $amount, string $date): void
    {
        $this->user->transactions()->create([
            'category_id' => Category::firstOrCreate(['name' => $category, 'type' => 'expense'])->id,
            'description' => 'x',
            'amount' => $amount,
            'type' => 'expense',
            'transaction_date' => $date,
        ]);
    }

    public function test_january_is_compared_with_the_previous_december(): void
    {
        $this->expense('Food', 100, '2026-01-10');
        $this->expense('Food', 50, '2025-12-10');

        $this->getJson('/api/financial-records/month-comparison?month=2026-01', $this->headers)
            ->assertOk()
            ->assertJson([
                'current' => ['income' => 1000, 'expenses' => 700, 'savings' => 300],
                'previous' => ['income' => 1000, 'expenses' => 650, 'savings' => 350],
                'change_pct' => ['income' => 0, 'expenses' => 7.7, 'savings' => -14.3],
            ]);
    }

    public function test_change_is_null_when_the_previous_month_is_zero(): void
    {
        $this->user->update(['monthly_income' => 0, 'monthly_expenses' => 0]);

        $this->getJson('/api/financial-records/month-comparison', $this->headers)
            ->assertOk()
            ->assertJson(['change_pct' => ['income' => null, 'expenses' => null, 'savings' => null]]);
    }

    public function test_expenses_by_category_carry_last_months_total_and_change(): void
    {
        $this->expense('Food', 100, '2026-01-10');
        $this->expense('Food', 50, '2025-12-31');
        $this->expense('Fun', 30, '2026-01-12');

        $rows = collect($this->getJson('/api/transactions/expenses-by-category?month=2026-01', $this->headers)
            ->assertOk()->json())->keyBy('category');

        $this->assertEquals(50, $rows['Food']['previous_total']);
        $this->assertEquals(100.0, $rows['Food']['change_pct']);
        $this->assertNull($rows['Fun']['change_pct']);
    }
}
