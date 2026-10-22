<?php

namespace App\Http\Controllers;

use App\Exceptions\StatementParseException;
use App\Http\Requests\Transaction\ImportPreviewRequest;
use App\Http\Requests\Transaction\ImportTransactionsRequest;
use App\Http\Requests\Transaction\SuggestCategoriesRequest;
use App\Models\Category;
use App\Models\FinancialRecord;
use App\Models\Transaction;
use App\Services\BankStatementParser;
use App\Services\FinancialCacheService;
use App\Services\PdfTextExtractor;
use App\Services\StatementCategorizer;
use App\Services\StatementImportAnalyzer;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class TransactionImportController extends Controller
{
    /**
     * @OA\Post(
     *     path="/api/transactions/import/preview",
     *     tags={"Transactions"},
     *     summary="Read an ActivoBank statement PDF and preview its movements (nothing is saved)",
     *     description="Admin only (permission: import statements). Debit/credit is derived from the running balance and the statement's opening/closing balances must reconcile.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\MediaType(mediaType="multipart/form-data",
     *
     *             @OA\Schema(required={"file"}, @OA\Property(property="file", type="string", format="binary"))
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="period, reconciliation, rows (date, description, amount, type, is_transfer, is_duplicate, suggested_category_id), other_categories ({income, expense} ids of the fallback categories, null if missing), file_hash and previous_import ({imported_at, rows_imported} when the same file was imported before, else null)"),
     *     @OA\Response(response=422, description="Unreadable or unsupported statement; body has a `code`")
     * )
     */
    public function preview(
        ImportPreviewRequest $request,
        PdfTextExtractor $extractor,
        BankStatementParser $parser,
        StatementImportAnalyzer $analyzer,
    ) {
        try {
            $statement = $parser->parse($extractor->extract($request->file('file')->getRealPath()));
        } catch (StatementParseException $e) {
            // Only the fixed code is returned; no statement text ever reaches the response or the logs.
            Log::channel('import')->warning('Statement parse failed', ['code' => $e->getMessage(), 'user_id' => $request->user()->id]);

            return response()->json([
                'message' => __('messages.import_'.$e->getMessage()),
                'code' => $e->getMessage(),
            ], 422);
        }

        // Only a fingerprint of the file is kept (see store()), so importing the same statement twice can be flagged.
        $hash = hash_file('sha256', $request->file('file')->getRealPath());
        $previous = $request->user()->statementImports()->where('file_hash', $hash)->latest()->first();

        return response()->json([
            'period' => ['from' => $statement->from, 'to' => $statement->to],
            'reconciliation' => ['opening' => $statement->opening, 'closing' => $statement->closing, 'ok' => true],
            'rows' => $analyzer->analyze($request->user(), $statement->rows),
            'other_categories' => $this->otherCategories(),
            'file_hash' => $hash,
            'previous_import' => $previous ? ['imported_at' => $previous->created_at, 'rows_imported' => $previous->rows_imported] : null,
        ]);
    }

    /**
     * @OA\Post(
     *     path="/api/transactions/import",
     *     tags={"Transactions"},
     *     summary="Create the confirmed rows of a statement preview as transactions",
     *     description="Admin only (permission: import statements). All-or-nothing, 1-500 rows, duplicates are not filtered (the preview flags them).",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"rows"},
     *
     *             @OA\Property(property="statement", type="object", description="Optional: {hash, from, to} from the preview; stores a light import record"),
     *             @OA\Property(property="rows", type="array", @OA\Items(
     *                 required={"date","description","amount","type","category_id"},
     *                 @OA\Property(property="date", type="string", example="2026-09-02"),
     *                 @OA\Property(property="description", type="string"),
     *                 @OA\Property(property="notes", type="string", nullable=true),
     *                 @OA\Property(property="amount", type="number"),
     *                 @OA\Property(property="type", type="string", enum={"income","expense"}),
     *                 @OA\Property(property="category_id", type="integer")
     *             ))
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Number of transactions created",
     *
     *         @OA\JsonContent(@OA\Property(property="imported", type="integer"))
     *     )
     * )
     */
    public function store(ImportTransactionsRequest $request)
    {
        $rows = $request->validated('rows');

        // Check every category/type pair first so one bad row cannot leave the others behind.
        foreach ($rows as $i => $row) {
            try {
                Category::assertMatchesTransactionType($row['category_id'], $row['type']);
            } catch (ValidationException $e) {
                throw ValidationException::withMessages(["rows.{$i}.category_id" => $e->errors()['category_id']]);
            }
        }

        DB::transaction(function () use ($request, $rows): void {
            if ($statement = $request->validated('statement')) {
                $request->user()->statementImports()->create([
                    'file_hash' => $statement['hash'],
                    'period_from' => $statement['from'],
                    'period_to' => $statement['to'],
                    'rows_imported' => count($rows),
                ]);
            }

            // Per-row model events would re-aggregate the month 500 times; sync each affected month once instead.
            Transaction::withoutEvents(function () use ($request, $rows): void {
                foreach ($rows as $row) {
                    $request->user()->transactions()->create([
                        'category_id' => $row['category_id'],
                        'description' => $row['description'],
                        'source_description' => $row['source_description'] ?? null,
                        'notes' => $row['notes'] ?? null,
                        'amount' => $row['amount'],
                        'type' => $row['type'],
                        'transaction_date' => $row['date'],
                    ]);
                }
            });

            // After commit, so a concurrent read cannot re-cache the pre-import totals.
            DB::afterCommit(fn () => FinancialCacheService::clearForUser($request->user()));
            collect($rows)->map(fn ($row) => substr($row['date'], 0, 7))->unique()->each(
                fn (string $month) => FinancialRecord::syncFromTransactions($request->user(), (int) substr($month, 0, 4), (int) substr($month, 5, 2))
            );
        });

        Log::channel('import')->info('Statement imported', ['user_id' => $request->user()->id, 'imported' => count($rows)]);

        return response()->json(['imported' => count($rows)], 201);
    }

    /**
     * @OA\Post(
     *     path="/api/transactions/import/suggest",
     *     tags={"Transactions"},
     *     summary="Ask the local AI model to suggest a category per statement row",
     *     description="Admin only (permission: import statements). Only each row's description and type are sent to the model, which runs on local Ollama (never a cloud provider). The answer is advisory and checked against real categories. When no model is available the response is `available: false`, not an error.",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"rows"},
     *
     *             @OA\Property(property="rows", type="array", @OA\Items(
     *                 required={"description","type"},
     *                 @OA\Property(property="description", type="string"),
     *                 @OA\Property(property="type", type="string", enum={"income","expense"})
     *             ))
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="`available`, `busy` (another suggestion of the same user is still running) and `suggestions` (one {category_id} per row, same order)")
     * )
     */
    public function suggest(SuggestCategoriesRequest $request, StatementCategorizer $categorizer)
    {
        // One run per user: the local model handles a single request at a time. A second request (e.g. the same
        // statement chosen again while the first is still being answered) waits its turn instead of failing.
        $lock = Cache::lock('statement-ai:'.$request->user()->id, 600);
        try {
            $lock->block((int) config('ai.statement.lock_wait'));
        } catch (LockTimeoutException) {
            Log::channel('import')->info('Statement AI busy', ['user_id' => $request->user()->id]);

            return response()->json(['available' => false, 'busy' => true, 'suggestions' => []]);
        }

        try {
            $suggestions = $categorizer->suggest(array_values($request->validated('rows')));
        } finally {
            $lock->release();
        }

        return response()->json([
            'available' => $suggestions !== null,
            'busy' => false,
            'suggestions' => $suggestions === null ? [] : array_values($suggestions),
        ]);
    }

    /** Fallback categories for rows with no suggestion, looked up here so the SPA does not depend on their names. */
    private function otherCategories(): array
    {
        return [
            'income' => Category::where('name', 'Other Income')->where('type', 'income')->value('id'),
            'expense' => Category::where('name', 'Other Expenses')->where('type', 'expense')->value('id'),
        ];
    }
}
