<?php

namespace Tests\Unit;

use App\Exceptions\StatementParseException;
use App\Services\BankStatementParser;
use Tests\TestCase;

class BankStatementParserTest extends TestCase
{
    private function fixture(): string
    {
        return file_get_contents(__DIR__.'/../fixtures/activobank-statement.txt');
    }

    public function test_parses_period_balances_and_rows_with_signs_from_the_balance(): void
    {
        $s = (new BankStatementParser)->parse($this->fixture());

        $this->assertSame('2026-03-01', $s->from);
        $this->assertSame('2026-03-31', $s->to);
        $this->assertSame(100.0, $s->opening);
        $this->assertSame(100.0, $s->closing);
        $this->assertCount(3, $s->rows); // carry-over lines are not movements

        $this->assertSame('2026-03-02', $s->rows[0]['date']);
        $this->assertSame('TRF. P/O MARIA TESTE', $s->rows[0]['description']);
        $this->assertSame(50.0, $s->rows[0]['amount']);   // credit
        $this->assertSame(-20.0, $s->rows[1]['amount']);  // debit
        $this->assertSame('2026-03-10', $s->rows[2]['date']); // launch date, not value date
        $this->assertSame(-30.0, $s->rows[2]['amount']);
        $this->assertSame(100.0, $s->rows[2]['balance']);
    }

    public function test_assigns_the_year_per_line_when_the_period_crosses_new_year(): void
    {
        $text = "EXTRATO DE\n 2025/12/15 A 2026/01/14\nSALDO INICIAL\t10.00\n12.20 12.20\nCOMPRA 1 A\t4.00 6.00\n1.05 1.05\nTRF. P/O B\t4.00 10.00\nSALDO FINAL\t10.00\n";

        $s = (new BankStatementParser)->parse($text);

        $this->assertSame('2025-12-20', $s->rows[0]['date']);
        $this->assertSame('2026-01-05', $s->rows[1]['date']);
    }

    public function test_closing_balance_mismatch_is_rejected(): void
    {
        $this->expectException(StatementParseException::class);
        $this->expectExceptionMessage('balance_mismatch');

        (new BankStatementParser)->parse(str_replace("SALDO FINAL\t100.00", "SALDO FINAL\t999.00", $this->fixture()));
    }

    public function test_a_printed_amount_that_disagrees_with_the_balance_is_rejected(): void
    {
        $this->expectExceptionMessage('balance_mismatch');

        (new BankStatementParser)->parse(str_replace("LOJA EXEMPLO LISBOA\t20.00 130.00", "LOJA EXEMPLO LISBOA\t25.00 130.00", $this->fixture()));
    }

    public function test_a_movement_without_a_balance_is_rejected_not_guessed(): void
    {
        $this->expectExceptionMessage('balance_mismatch');

        (new BankStatementParser)->parse(str_replace("LOJA EXEMPLO LISBOA\t20.00 130.00", "LOJA EXEMPLO LISBOA\t20.00", $this->fixture()));
    }

    public function test_text_that_is_not_a_statement_is_unsupported(): void
    {
        $this->expectException(StatementParseException::class);
        $this->expectExceptionMessage('unsupported_format');

        (new BankStatementParser)->parse('hello world, not a bank statement');
    }

    public function test_zero_amount_movements_are_skipped(): void
    {
        $text = str_replace("3.04 3.04\n", "3.03 3.03\nTAXA ZERO\t0.00 150.00\n3.04 3.04\n", $this->fixture());

        $s = (new BankStatementParser)->parse($text);

        $this->assertCount(3, $s->rows);
    }
}
