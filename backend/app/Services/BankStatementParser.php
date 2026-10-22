<?php

namespace App\Services;

use App\Exceptions\StatementParseException;

/**
 * Reads the text of an ActivoBank "Extrato combinado". Each movement is a line with the launch and value dates
 * ("9.30 9.29", month.day) followed by "description<TAB>amount balance". Debit and credit are not distinguishable
 * in the text, so the sign comes from the running balance, which doubles as the reconciliation check.
 */
class BankStatementParser
{
    private const NUMBER = '[\d,]*\d\.\d{2}';

    public function parse(string $text): ParsedStatement
    {
        $lines = preg_split('/\R/', $text) ?: [];

        if (! preg_match('/(\d{4})\/(\d{2})\/(\d{2})\s+A\s+(\d{4})\/(\d{2})\/(\d{2})/', $text, $p)) {
            throw new StatementParseException('unsupported_format');
        }
        $from = "{$p[1]}-{$p[2]}-{$p[3]}";
        $to = "{$p[4]}-{$p[5]}-{$p[6]}";

        $opening = $this->labelledNumber($lines, 'SALDO INICIAL');
        $closing = $this->labelledNumber($lines, 'SALDO FINAL');
        if ($opening === null || $closing === null) {
            throw new StatementParseException('unsupported_format');
        }

        $rows = [];
        $previous = $opening;
        $count = count($lines);

        for ($i = 0; $i < $count; $i++) {
            if (! preg_match('/^\s*(\d{1,2})\.(\d{2})\s+\d{1,2}\.\d{2}\s*$/', $lines[$i], $d)) {
                continue;
            }

            // First non-empty line after the dates is "description<TAB>amount balance".
            $j = $i + 1;
            while ($j < $count && trim($lines[$j]) === '') {
                $j++;
            }
            if ($j >= $count || ! preg_match('/^(.*?)\t\s*('.self::NUMBER.')\s+('.self::NUMBER.')\s*$/', $lines[$j], $m)) {
                throw new StatementParseException('balance_mismatch');
            }

            $amount = $this->number($m[2]);
            $balance = $this->number($m[3]);
            $delta = round($balance - $previous, 2);
            if (abs(abs($delta) - $amount) > 0.005) {
                throw new StatementParseException('balance_mismatch');
            }

            // A 0.00 movement (e.g. a waived fee) changes nothing and could not be imported (amount must be > 0).
            if ($amount === 0.0) {
                $previous = $balance;
                $i = $j;

                continue;
            }

            $rows[] = [
                'date' => sprintf('%d-%02d-%02d', $this->year($from, $to, (int) $d[1]), (int) $d[1], (int) $d[2]),
                'description' => trim(preg_replace('/\s+/', ' ', $m[1])),
                'amount' => $delta,
                'balance' => $balance,
            ];
            $previous = $balance;
            $i = $j;
        }

        if (abs($previous - $closing) > 0.005) {
            throw new StatementParseException('balance_mismatch');
        }

        return new ParsedStatement($from, $to, $opening, $closing, $rows);
    }

    /** @param  array<int, string>  $lines */
    private function labelledNumber(array $lines, string $label): ?float
    {
        foreach ($lines as $line) {
            if (preg_match('/^\s*'.preg_quote($label, '/').'\s*\t\s*('.self::NUMBER.')\s*$/', $line, $m)) {
                return $this->number($m[1]);
            }
        }

        return null;
    }

    private function number(string $value): float
    {
        return (float) str_replace(',', '', $value);
    }

    /** The statement header carries the only year; a Dec→Jan period uses the start year from the start month on. */
    private function year(string $from, string $to, int $month): int
    {
        $fromYear = (int) substr($from, 0, 4);
        $toYear = (int) substr($to, 0, 4);
        if ($fromYear === $toYear) {
            return $fromYear;
        }

        return $month >= (int) substr($from, 5, 2) ? $fromYear : $toYear;
    }
}
