<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Services\TokenService;

class FinancialRecordControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        /** @var User $user */
        $user = User::factory()->create([
            'monthly_income' => 5000,
            'monthly_expenses' => 3000,
        ]);
        $this->user = $user;
        $this->token = TokenService::issue($this->user);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $this->getJson('/api/financial-records/current')->assertStatus(401);
    }

    public function test_current_returns_default_record_when_none_exists(): void
    {
        $response = $this->getJson('/api/financial-records/current', $this->authHeader());

        $response->assertStatus(200)
            ->assertJsonStructure(['monthly_income', 'monthly_expenses']);
    }

    public function test_current_returns_existing_record(): void
    {
        $this->user->financialRecords()->create([
            'year' => (int) date('Y'),
            'month' => (int) date('n'),
            'monthly_income' => 6000,
            'monthly_expenses' => 2000,
            'savings_goal' => 500,
            'savings_goal_type' => 'fixed',
        ]);

        $this->getJson('/api/financial-records/current', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('monthly_income', 6000)
            ->assertJsonPath('monthly_expenses', 2000);
    }

    public function test_by_year_returns_records_for_that_year(): void
    {
        $this->user->financialRecords()->create([
            'year' => 2025,
            'month' => 1,
            'monthly_income' => 4000,
            'monthly_expenses' => 2000,
            'savings_goal' => 0,
            'savings_goal_type' => 'fixed',
        ]);
        $this->user->financialRecords()->create([
            'year' => 2024,
            'month' => 12,
            'monthly_income' => 3500,
            'monthly_expenses' => 1800,
            'savings_goal' => 0,
            'savings_goal_type' => 'fixed',
        ]);

        $this->getJson('/api/financial-records/year/2025', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.year', 2025);
    }

    public function test_store_creates_financial_record(): void
    {
        $this->postJson('/api/financial-records', [
            'year' => 2025,
            'month' => 7,
            'monthly_income' => 5500,
            'monthly_expenses' => 2800,
            'savings_goal' => 300,
            'savings_goal_type' => 'fixed',
        ], $this->authHeader())
            ->assertStatus(201)
            ->assertJsonPath('monthly_income', 5500);

        $this->assertDatabaseHas('financial_records', [
            'user_id' => $this->user->id,
            'year' => 2025,
            'month' => 7,
        ]);
    }

    public function test_cannot_access_another_users_records(): void
    {
        $other = User::factory()->create();
        $record = $other->financialRecords()->create([
            'year' => 2025,
            'month' => 1,
            'monthly_income' => 1000,
            'monthly_expenses' => 500,
            'savings_goal' => 0,
            'savings_goal_type' => 'fixed',
        ]);

        $this->getJson("/api/financial-records/{$record->id}", $this->authHeader())
            ->assertStatus(404);
    }
}
