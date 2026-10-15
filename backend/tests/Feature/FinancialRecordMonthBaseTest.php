<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialRecordMonthBaseTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private array $headers;

    private int $year;

    private int $month;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create([
            'monthly_income' => 5000,
            'monthly_expenses' => 3000,
        ]);
        $this->headers = ['Authorization' => 'Bearer '.TokenService::issue($this->user)];
        $this->year = (int) date('Y');
        $this->month = (int) date('n');
    }

    private function addTransaction(string $type, float $amount, ?string $date = null): void
    {
        $category = Category::create(['name' => 'Test '.$type.$amount, 'type' => $type]);

        $this->user->transactions()->create([
            'category_id' => $category->id,
            'description' => 'Test',
            'amount' => $amount,
            'type' => $type,
            'transaction_date' => $date ?? now()->toDateString(),
        ]);
    }

    private function currentRecord(): array
    {
        return $this->getJson('/api/financial-records/current', $this->headers)
            ->assertStatus(200)
            ->json();
    }

    public function test_month_starts_at_the_default(): void
    {
        $record = $this->currentRecord();

        $this->assertEquals(5000, $record['monthly_income']);
        $this->assertEquals(3000, $record['monthly_expenses']);
    }

    public function test_transactions_add_to_the_default(): void
    {
        $this->addTransaction('income', 200);
        $this->addTransaction('expense', 50);

        $record = $this->currentRecord();

        $this->assertEquals(5200, $record['monthly_income']);
        $this->assertEquals(3050, $record['monthly_expenses']);
    }

    public function test_deleting_the_transactions_goes_back_to_the_default(): void
    {
        $this->addTransaction('income', 200);
        $this->user->transactions()->get()->each->delete();

        $this->assertEquals(5000, $this->currentRecord()['monthly_income']);
    }

    public function test_changing_the_default_updates_months_that_follow_it(): void
    {
        $this->addTransaction('income', 200);

        $this->user->update(['monthly_income' => 6000]);

        $this->assertEquals(6200, $this->currentRecord()['monthly_income']);
    }

    public function test_custom_month_uses_its_own_base_plus_transactions(): void
    {
        $this->addTransaction('income', 200);

        $this->postJson('/api/financial-records', [
            'year' => $this->year,
            'month' => $this->month,
            'is_custom' => true,
            'base_income' => 1000,
            'base_expenses' => 400,
        ], $this->headers)
            ->assertStatus(201)
            ->assertJsonPath('is_custom', true)
            ->assertJsonPath('monthly_income', 1200)
            ->assertJsonPath('monthly_expenses', 400);
    }

    public function test_custom_month_ignores_changes_to_the_default(): void
    {
        $this->postJson('/api/financial-records', [
            'year' => $this->year,
            'month' => $this->month,
            'is_custom' => true,
            'base_income' => 1000,
            'base_expenses' => 400,
        ], $this->headers)->assertStatus(201);

        $this->user->update(['monthly_income' => 9000]);

        $this->assertEquals(1000, $this->currentRecord()['monthly_income']);
    }

    public function test_resetting_a_custom_month_goes_back_to_the_default(): void
    {
        $this->postJson('/api/financial-records', [
            'year' => $this->year,
            'month' => $this->month,
            'is_custom' => true,
            'base_income' => 1000,
            'base_expenses' => 400,
        ], $this->headers)->assertStatus(201);

        $this->postJson('/api/financial-records', [
            'year' => $this->year,
            'month' => $this->month,
            'is_custom' => false,
        ], $this->headers)
            ->assertJsonPath('is_custom', false)
            ->assertJsonPath('monthly_income', 5000)
            ->assertJsonPath('monthly_expenses', 3000);
    }

    public function test_posted_income_and_expenses_are_ignored(): void
    {
        $this->postJson('/api/financial-records', [
            'year' => $this->year,
            'month' => $this->month,
            'monthly_income' => 1,
            'monthly_expenses' => 1,
            'savings_goal' => 100,
        ], $this->headers)
            ->assertStatus(201)
            ->assertJsonPath('monthly_income', 5000)
            ->assertJsonPath('monthly_expenses', 3000);
    }

    public function test_moving_a_transaction_updates_both_months(): void
    {
        $this->addTransaction('income', 200);
        $transaction = $this->user->transactions()->first();

        $other = now()->subMonthNoOverflow();
        $transaction->update(['transaction_date' => $other->toDateString()]);

        $this->assertEquals(5000, $this->currentRecord()['monthly_income']);

        $previous = $this->user->financialRecords()
            ->where(['year' => $other->year, 'month' => $other->month])
            ->first();
        $this->assertEquals(5200, (float) $previous->monthly_income);
    }

    public function test_year_view_fills_months_from_account_start(): void
    {
        $records = $this->getJson("/api/financial-records/year/{$this->year}", $this->headers)
            ->assertStatus(200)
            ->json();

        $this->assertCount(13 - $this->month, $records);
        $this->assertEquals(5000, $records[0]['monthly_income']);
    }
}
