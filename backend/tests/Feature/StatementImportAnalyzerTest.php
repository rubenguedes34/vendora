<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\StatementImportAnalyzer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatementImportAnalyzerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Category $food;

    private Category $salary;

    protected function setUp(): void
    {
        parent::setUp();
        /** @var User $user */
        $user = User::factory()->create(['name' => 'Joana Maria Exemplo']);
        $this->user = $user;
        $this->food = Category::create(['name' => 'Food', 'type' => 'expense']);
        $this->salary = Category::create(['name' => 'Salary', 'type' => 'income']);
    }

    private function row(string $description, float $amount = -10.0, string $date = '2026-09-02'): array
    {
        return ['date' => $date, 'description' => $description, 'amount' => $amount, 'balance' => 0.0];
    }

    private function analyze(array $rows): array
    {
        return (new StatementImportAnalyzer)->analyze($this->user, $rows);
    }

    public function test_type_and_absolute_amount_come_from_the_sign(): void
    {
        [$debit, $credit] = $this->analyze([$this->row('A', -12.5), $this->row('B', 7.0)]);

        $this->assertSame('expense', $debit['type']);
        $this->assertSame(12.5, $debit['amount']);
        $this->assertSame('income', $credit['type']);
        $this->assertSame(7.0, $credit['amount']);
    }

    public function test_two_name_tokens_flag_a_transfer_accent_and_case_insensitive(): void
    {
        $rows = $this->analyze([
            $this->row('TRF. P/O JOANA MARIA PEREIRA EXEMPLO'),
            $this->row('TRF. P/O CARLA FATIMA PEREIRA EXEMPLO'),   // surname only: one token
            $this->row('TRF P/ jóana exemplo'),                      // accents/case, two tokens
        ]);

        $this->assertTrue($rows[0]['is_transfer']);
        $this->assertFalse($rows[1]['is_transfer']);
        $this->assertTrue($rows[2]['is_transfer']);
    }

    public function test_portuguese_name_particles_do_not_count_as_name_tokens(): void
    {
        $this->user->update(['name' => 'Ana da Silva']);

        [$row] = $this->analyze([$this->row('TRF P/ MARIA DA SILVA')]);

        $this->assertFalse($row['is_transfer']); // "da" + "silva" would be two tokens without the particle rule
    }

    public function test_duplicate_on_the_last_statement_date_is_detected(): void
    {
        $this->user->transactions()->create([
            'category_id' => $this->food->id, 'description' => 'COMPRA 1 CONTINENTE', 'amount' => 10,
            'type' => 'expense', 'transaction_date' => '2026-09-30',
        ]);

        $rows = $this->analyze([$this->row('OUTRA', -1.0, '2026-09-02'), $this->row('COMPRA 1 CONTINENTE', -10.0, '2026-09-30')]);

        $this->assertTrue($rows[1]['is_duplicate']);
    }

    public function test_own_wallet_keywords_flag_a_transfer(): void
    {
        $rows = $this->analyze([$this->row('COMPRA 9767 Revolut 8027 Dublin IE'), $this->row('TRF P/ Joana Millennium'), $this->row('COMPRA 1 CONTINENTE')]);

        $this->assertTrue($rows[0]['is_transfer']);
        $this->assertTrue($rows[1]['is_transfer']);
        $this->assertFalse($rows[2]['is_transfer']);
    }

    public function test_duplicate_matching_is_count_aware_and_includes_manual_transactions(): void
    {
        $this->user->transactions()->create([
            'category_id' => $this->food->id, 'description' => 'COMPRA 1  CONTINENTE', 'amount' => 10,
            'type' => 'expense', 'transaction_date' => '2026-09-02',
        ]);

        $rows = $this->analyze([$this->row('COMPRA 1 CONTINENTE'), $this->row('COMPRA 1 CONTINENTE'), $this->row('COMPRA 1 CONTINENTE', -10.0, '2026-09-03')]);

        $this->assertTrue($rows[0]['is_duplicate']);   // one existing → first line is the duplicate
        $this->assertFalse($rows[1]['is_duplicate']);  // second identical line is new
        $this->assertFalse($rows[2]['is_duplicate']);  // different date
    }

    public function test_category_is_suggested_from_the_latest_same_description_and_type(): void
    {
        $this->user->transactions()->create([
            'category_id' => $this->food->id, 'description' => 'COMPRA 1 CONTINENTE', 'amount' => 3,
            'type' => 'expense', 'transaction_date' => '2026-08-01',
        ]);
        /** @var User $other */
        $other = User::factory()->create();
        $other->transactions()->create([
            'category_id' => $this->salary->id, 'description' => 'TRF. P/O EMPRESA', 'amount' => 3,
            'type' => 'income', 'transaction_date' => '2026-08-01',
        ]);

        [$known, $unknown] = $this->analyze([$this->row('COMPRA 1 CONTINENTE'), $this->row('TRF. P/O EMPRESA', 5.0)]);

        $this->assertSame($this->food->id, $known['suggested_category_id']);
        $this->assertNull($unknown['suggested_category_id']); // another user's history is never used
    }

    public function test_a_renamed_transaction_is_still_found_as_duplicate_and_teaches_its_category_by_the_bank_text(): void
    {
        $this->user->transactions()->create([
            'category_id' => $this->food->id, 'description' => 'Almoço com a equipa', 'source_description' => 'COMPRA 1 LOJA X',
            'amount' => 10, 'type' => 'expense', 'transaction_date' => '2026-09-02',
        ]);

        [$row] = $this->analyze([$this->row('COMPRA 1 LOJA X')]);

        $this->assertTrue($row['is_duplicate']);
        $this->assertSame($this->food->id, $row['suggested_category_id']);
    }
}
