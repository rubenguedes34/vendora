<?php

namespace App\Services;

final class ParsedStatement
{
    /**
     * @param  array<int, array{date: string, description: string, amount: float, balance: float}>  $rows  amount is signed: credit +, debit -
     */
    public function __construct(
        public readonly string $from,
        public readonly string $to,
        public readonly float $opening,
        public readonly float $closing,
        public readonly array $rows,
    ) {}
}
