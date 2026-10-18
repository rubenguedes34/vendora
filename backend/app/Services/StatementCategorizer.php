<?php

namespace App\Services;

use App\Models\Category;
use Illuminate\Support\Collection;

/**
 * Asks the local model for a category per statement description. The reply is deliberately tiny ("1=4" lines):
 * on a CPU-only host the number of generated tokens is what makes it slow. The model only proposes: its answer is
 * checked against the real categories and the row type, and anything else becomes null.
 */
class StatementCategorizer
{
    private const CHUNK = 25;

    /** @param  float  $budgetSeconds  no new chunk is started past this (the SPA gives up at 180 s) */
    public function __construct(private StatementAi $ai, private float $budgetSeconds = 150) {}

    /**
     * @param  array<int, array{description: string, type: string}>  $rows
     * @return array<int, array{category_id: int|null, warning: string|null}>|null null when the AI is unavailable
     */
    public function suggest(array $rows): ?array
    {
        $categories = Category::query()->orderBy('name')->get(['id', 'name', 'type']);

        // One line per distinct (type, description): repeated purchases are asked about once.
        $groups = [];
        foreach ($rows as $index => $row) {
            $groups[$row['type'].'|'.$row['description']][] = $index;
        }

        $result = [];
        $answered = 0;
        $started = microtime(true);

        foreach (array_chunk($groups, self::CHUNK, true) as $chunk) {
            // Earlier chunks are kept: one slow or failed chunk must not throw away what the model already answered.
            if ($answered > 0 && microtime(true) - $started >= $this->budgetSeconds) {
                break;
            }

            $entries = [];
            foreach ($chunk as $key => $indexes) {
                [$type, $description] = explode('|', $key, 2);
                $entries[] = ['type' => $type, 'description' => $description, 'indexes' => $indexes];
            }

            $reply = $this->ai->complete($this->instructions(), $this->prompt($entries, $categories));
            if ($reply === null) {
                if ($answered === 0) {
                    return null;
                }
                break;
            }

            $answered++;
            $picked = $this->parse($reply);
            foreach ($entries as $position => $entry) {
                $categoryId = $this->valid($picked[$position + 1] ?? null, $entry['type'], $categories);
                foreach ($entry['indexes'] as $index) {
                    $result[$index] = ['category_id' => $categoryId, 'warning' => null];
                }
            }
        }

        // Rows of chunks that were not asked (or failed) simply have no suggestion.
        foreach (array_keys($rows) as $index) {
            $result[$index] ??= ['category_id' => null, 'warning' => null];
        }

        ksort($result);

        return $result;
    }

    private function instructions(): string
    {
        return <<<'TXT'
You categorise bank statement movements. Reply with one line per movement: the movement number, "=", and the
best category id from the list (or "-" when unsure). Income movements take income categories; expense movements
take expense or savings categories. Transfers to or from a person ("TRF"), unclear movements and anything
you are unsure about go to the category named "Other Income" (income) or "Other Expenses" (expense).
No other text.
Example reply for 3 movements:
1=4
2=-
3=7
TXT;
    }

    /** @param  array<int, array{type: string, description: string}>  $entries */
    private function prompt(array $entries, Collection $categories): string
    {
        $cats = $categories->map(fn ($c) => "{$c->id}: {$c->name} ({$c->type})")->implode("\n");
        $list = collect($entries)->map(fn ($e, $i) => ($i + 1).". [{$e['type']}] ".$this->singleLine($e['description']))->implode("\n");

        return "Categories:\n{$cats}\n\nMovements:\n{$list}";
    }

    /** Statement text is third-party input (e.g. a transfer reference): it must stay on its own prompt line. */
    private function singleLine(string $text): string
    {
        return trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', $text));
    }

    /**
     * Accepts "1=4", "2: 7", "3. 7" and the "1=N=4" echo some small models produce; "-" means no category.
     *
     * @return array<int, int|null> movement number → category id
     */
    private function parse(string $reply): array
    {
        $picked = [];
        foreach (preg_split('/\R/', $reply) ?: [] as $line) {
            if (preg_match('/^\s*(\d+)\s*[=:.\-)]\s*(?:N\s*=\s*)?(\d+|-)\s*$/i', $line, $m)) {
                $picked[(int) $m[1]] = $m[2] === '-' ? null : (int) $m[2];
            }
        }

        return $picked;
    }

    private function valid(?int $categoryId, string $type, Collection $categories): ?int
    {
        $allowed = $type === 'income' ? ['income'] : ['expense', 'savings'];

        return $categoryId !== null && $categories->contains(fn ($c) => $c->id === $categoryId && in_array($c->type, $allowed, true))
            ? $categoryId
            : null;
    }
}
