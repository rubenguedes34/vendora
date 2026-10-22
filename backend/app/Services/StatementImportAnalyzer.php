<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Str;

/**
 * Adds what the preview needs to each parsed row: income/expense, whether it looks like a move between the
 * user's own accounts, whether it already exists, and a category taken from the user's own history.
 */
class StatementImportAnalyzer
{
    /** Wallets and banks the user is known to move money between. */
    private const OWN_ACCOUNT_KEYWORDS = ['revolut', 'millennium'];

    /**
     * @param  array<int, array{date: string, description: string, amount: float}>  $rows
     * @return array<int, array{date: string, description: string, amount: float, type: string, is_transfer: bool, is_duplicate: bool, suggested_category_id: int|null}>
     */
    public function analyze(User $user, array $rows): array
    {
        $nameTokens = $this->tokens($user->name);
        $remaining = $this->existingCounts($user, $rows);
        $suggestions = $this->suggestions($user, $rows);

        $out = [];
        foreach ($rows as $row) {
            $type = $row['amount'] >= 0 ? 'income' : 'expense';
            $amount = round(abs($row['amount']), 2);
            $description = $this->normalise($row['description']);

            $key = $this->key($row['date'], $amount, $type, $description);
            $isDuplicate = ($remaining[$key] ?? 0) > 0;
            if ($isDuplicate) {
                $remaining[$key]--;
            }

            $out[] = [
                'date' => $row['date'],
                'description' => $description,
                'amount' => $amount,
                'type' => $type,
                'is_transfer' => $this->isOwnTransfer($description, $nameTokens),
                'is_duplicate' => $isDuplicate,
                'suggested_category_id' => $suggestions[$type.'|'.$description] ?? null,
            ];
        }

        return $out;
    }

    private function normalise(string $description): string
    {
        return mb_substr(trim(preg_replace('/\s+/', ' ', $description)), 0, 255);
    }

    /** @return array<int, string> */
    private function tokens(string $text): array
    {
        return array_values(array_filter(
            preg_split('/[^a-z0-9]+/', Str::lower(Str::ascii($text))) ?: [],
            fn ($t) => strlen($t) >= 3, // also drops Portuguese particles (da, de, do) that many names share
        ));
    }

    /** @param  array<int, string>  $nameTokens */
    private function isOwnTransfer(string $description, array $nameTokens): bool
    {
        $words = $this->tokens($description);

        if (count(array_intersect($nameTokens, $words)) >= 2) {
            return true;
        }

        return array_intersect(self::OWN_ACCOUNT_KEYWORDS, $words) !== [];
    }

    private function key(string $date, float $amount, string $type, string $description): string
    {
        return sprintf('%s|%.2f|%s|%s', $date, $amount, $type, $description);
    }

    /** @return array<string, int> how many matching transactions the user already has, per key */
    private function existingCounts(User $user, array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $dates = array_column($rows, 'date');
        $counts = [];
        // whereDate: on SQLite the date cast is stored as "Y-m-d 00:00:00", which sorts after a bare "Y-m-d" bound.
        $user->transactions()
            ->whereDate('transaction_date', '>=', min($dates))
            ->whereDate('transaction_date', '<=', max($dates))
            ->get(['description', 'source_description', 'amount', 'type', 'transaction_date'])
            ->each(function ($t) use (&$counts): void {
                $key = $this->key($t->transaction_date->format('Y-m-d'), (float) $t->amount, $t->type, $this->normalise($t->source_description ?? $t->description));
                $counts[$key] = ($counts[$key] ?? 0) + 1;
            });

        return $counts;
    }

    /** @return array<string, int> "type|description" → category id of the user's latest matching transaction */
    private function suggestions(User $user, array $rows): array
    {
        $descriptions = array_values(array_unique(array_map(fn ($r) => $this->normalise($r['description']), $rows)));
        if ($descriptions === []) {
            return [];
        }

        $found = [];
        // Match the bank's original text when it was kept, so a renamed movement still teaches its category.
        $user->transactions()
            ->where(fn ($q) => $q->whereIn('source_description', $descriptions)
                ->orWhere(fn ($q) => $q->whereNull('source_description')->whereIn('description', $descriptions)))
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->get(['description', 'source_description', 'type', 'category_id'])
            ->each(function ($t) use (&$found): void {
                $found[$t->type.'|'.($t->source_description ?? $t->description)] ??= $t->category_id;
            });

        return $found;
    }
}
