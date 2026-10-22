<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\TokenService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class TransactionImportStoreTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private Category $food;

    private Category $salary;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->admin = $admin;
        $this->food = Category::create(['name' => 'Food', 'type' => 'expense']);
        $this->salary = Category::create(['name' => 'Salary', 'type' => 'income']);
    }

    private function headers(?User $user = null): array
    {
        return ['Authorization' => 'Bearer '.TokenService::issue($user ?? $this->admin)];
    }

    private function row(array $override = []): array
    {
        return $override + ['date' => '2026-09-02', 'description' => 'COMPRA 1 LOJA', 'amount' => 12.5, 'type' => 'expense', 'category_id' => $this->food->id];
    }

    public function test_requires_authentication_and_the_permission(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [$this->row()]])->assertStatus(401);

        /** @var User $plain */
        $plain = User::factory()->create();
        $plain->assignRole('user');
        $this->postJson('/api/transactions/import', ['rows' => [$this->row()]], $this->headers($plain))->assertStatus(403);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_creates_the_rows_for_the_authenticated_user_only(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [
            $this->row(),
            $this->row(['type' => 'income', 'category_id' => $this->salary->id, 'description' => 'SALARIO', 'amount' => 1000]),
        ], 'user_id' => 999], $this->headers())
            ->assertStatus(201)
            ->assertJsonPath('imported', 2);

        $this->assertSame(2, $this->admin->transactions()->count());
        $this->assertDatabaseCount('transactions', 2);
        $this->assertDatabaseHas('transactions', ['user_id' => $this->admin->id, 'description' => 'SALARIO', 'type' => 'income']);
    }

    public function test_duplicates_are_not_filtered_here(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [$this->row(), $this->row()]], $this->headers())->assertStatus(201);

        $this->assertSame(2, $this->admin->transactions()->count());
    }

    public function test_category_type_mismatch_rejects_everything(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [
            $this->row(),
            $this->row(['category_id' => $this->salary->id]), // income category on an expense
        ]], $this->headers())->assertStatus(422);

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_validation_and_row_cap(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => []], $this->headers())->assertStatus(422);
        $this->postJson('/api/transactions/import', ['rows' => [$this->row(['amount' => 0])]], $this->headers())->assertStatus(422);
        $this->postJson('/api/transactions/import', ['rows' => [$this->row(['date' => 'nope'])]], $this->headers())->assertStatus(422);
        $this->postJson('/api/transactions/import', ['rows' => array_fill(0, 501, $this->row())], $this->headers())->assertStatus(422);

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_monthly_totals_are_updated_through_the_model_hooks(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [$this->row(['amount' => 40])]], $this->headers())->assertStatus(201);

        $this->assertDatabaseHas('financial_records', ['user_id' => $this->admin->id, 'year' => 2026, 'month' => 9]);
    }

    public function test_an_edited_description_and_a_note_are_saved(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [
            $this->row(['description' => 'Jantar com o João', 'notes' => 'Aniversário dele']),
            $this->row(['description' => 'Sem nota']),
        ]], $this->headers())->assertStatus(201);

        $this->assertDatabaseHas('transactions', ['description' => 'Jantar com o João', 'notes' => 'Aniversário dele']);
        $this->assertDatabaseHas('transactions', ['description' => 'Sem nota', 'notes' => null]);
    }

    public function test_a_note_longer_than_1000_characters_is_rejected(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [$this->row(['notes' => str_repeat('x', 1001)])]], $this->headers())
            ->assertStatus(422);

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_the_statement_period_must_not_end_before_it_starts(): void
    {
        $this->postJson('/api/transactions/import', [
            'statement' => ['hash' => str_repeat('a', 64), 'from' => '2026-09-30', 'to' => '2026-09-01'],
            'rows' => [$this->row()],
        ], $this->headers())->assertStatus(422);

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_the_banks_original_text_is_kept_beside_an_edited_description(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [
            $this->row(['description' => 'Almoço', 'source_description' => 'COMPRA 1 LOJA']),
        ]], $this->headers())->assertStatus(201);

        $this->assertDatabaseHas('transactions', ['description' => 'Almoço', 'source_description' => 'COMPRA 1 LOJA']);
    }

    public function test_amounts_with_more_than_two_decimals_are_rejected(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [$this->row(['amount' => 12.345])]], $this->headers())
            ->assertStatus(422);
    }

    public function test_monthly_totals_are_right_across_months_and_the_cache_is_cleared(): void
    {
        Cache::put("health-score:{$this->admin->id}", 'stale');
        Cache::put("net-worth:{$this->admin->id}", 'stale');

        $this->postJson('/api/transactions/import', ['rows' => [
            $this->row(['amount' => 10]),
            $this->row(['amount' => 5, 'date' => '2026-09-20']),
            $this->row(['amount' => 7, 'date' => '2026-10-01']),
        ]], $this->headers())->assertStatus(201);

        $this->assertSame(15.0, (float) $this->admin->financialRecords()->where('year', 2026)->where('month', 9)->value('monthly_expenses'));
        $this->assertSame(7.0, (float) $this->admin->financialRecords()->where('year', 2026)->where('month', 10)->value('monthly_expenses'));
        $this->assertFalse(Cache::has("health-score:{$this->admin->id}"));
        $this->assertFalse(Cache::has("net-worth:{$this->admin->id}"));
    }
}
