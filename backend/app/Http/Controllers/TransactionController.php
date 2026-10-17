<?php

namespace App\Http\Controllers;

use App\Http\Requests\Transaction\ExpensesByCategoryRequest;
use App\Http\Requests\Transaction\ExportTransactionRequest;
use App\Http\Requests\Transaction\IndexTransactionRequest;
use App\Http\Requests\Transaction\StoreTransactionRequest;
use App\Http\Requests\Transaction\UpdateTransactionRequest;
use App\Models\Category;
use App\Models\Tag;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TransactionController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/transactions",
     *     tags={"Transactions"},
     *     summary="List all transactions",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Array of transactions")
     * )
     */
    public function index(IndexTransactionRequest $request)
    {
        $query = $this->filteredQuery($request);

        $perPage = $request->integer('per_page', 20);
        $page = $request->integer('page', 1);

        return response()->json($query->paginate($perPage, ['*'], 'page', $page));
    }

    /**
     * @OA\Post(
     *     path="/api/transactions",
     *     tags={"Transactions"},
     *     summary="Create a transaction",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"category_id","description","amount","type","transaction_date"},
     *
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="transaction_date", type="string", format="date")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Transaction created")
     * )
     */
    public function store(StoreTransactionRequest $request)
    {
        Category::assertMatchesTransactionType($request->category_id, $request->type);

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->storeAs(
                'receipts/'.$request->user()->id,
                Str::uuid().'.'.$request->file('attachment')->extension()
            );
        }

        $transaction = $request->user()->transactions()->create([
            'category_id' => $request->category_id,
            'description' => $request->description,
            'amount' => $request->amount,
            'type' => $request->type,
            'transaction_date' => $request->transaction_date,
            'notes' => $request->notes,
            'attachment_path' => $attachmentPath,
        ]);

        if ($request->has('tag_ids')) {
            $tagIds = $this->resolveTagIds($request);
            $transaction->tags()->sync($tagIds);
        }

        return response()->json($transaction->load(['category', 'tags']), 201);
    }

    /**
     * @OA\Get(
     *     path="/api/transactions/{transaction}",
     *     tags={"Transactions"},
     *     summary="Get a single transaction",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="transaction", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Transaction object")
     * )
     */
    public function show($id)
    {
        $transaction = Transaction::with(['category', 'tags'])->findOrFail($id);
        $this->authorize('view', $transaction);

        return response()->json($transaction);
    }

    /**
     * @OA\Put(
     *     path="/api/transactions/{transaction}",
     *     tags={"Transactions"},
     *     summary="Update a transaction",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="transaction", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="transaction_date", type="string", format="date"),
     *             @OA\Property(property="notes", type="string"),
     *             @OA\Property(property="tag_ids", type="array", @OA\Items(type="integer"))
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Transaction updated")
     * )
     */
    public function update(UpdateTransactionRequest $request)
    {
        $transaction = $request->record();

        if ($request->hasAny(['category_id', 'type'])) {
            Category::assertMatchesTransactionType(
                $request->input('category_id', $transaction->category_id),
                $request->input('type', $transaction->type)
            );
        }

        $data = $request->only([
            'category_id', 'description', 'amount', 'type',
            'transaction_date', 'notes',
        ]);

        if ($request->hasFile('attachment')) {
            if ($transaction->attachment_path) {
                Storage::delete($transaction->attachment_path);
            }
            $data['attachment_path'] = $request->file('attachment')->storeAs(
                'receipts/'.$request->user()->id,
                Str::uuid().'.'.$request->file('attachment')->extension()
            );
        }

        $transaction->update($data);

        if ($request->has('tag_ids')) {
            $tagIds = $this->resolveTagIds($request);
            $transaction->tags()->sync($tagIds);
        }

        return response()->json($transaction->load(['category', 'tags']));
    }

    /**
     * @OA\Delete(
     *     path="/api/transactions/{transaction}",
     *     tags={"Transactions"},
     *     summary="Delete a transaction",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="transaction", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Transaction deleted")
     * )
     */
    public function destroy($id)
    {
        $transaction = Transaction::findOrFail($id);
        $this->authorize('delete', $transaction);

        if ($transaction->attachment_path) {
            Storage::delete($transaction->attachment_path);
        }

        $transaction->delete();

        return response()->json(['message' => __('messages.transaction_deleted')]);
    }

    /**
     * @OA\Get(
     *     path="/api/transactions/{id}/attachment",
     *     tags={"Transactions"},
     *     summary="Serve a transaction attachment",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Attachment file")
     * )
     */
    public function serveAttachment($id)
    {
        $transaction = Transaction::findOrFail($id);
        $this->authorize('view', $transaction);

        if (! $transaction->attachment_path || ! Storage::exists($transaction->attachment_path)) {
            return response()->json(['message' => __('messages.attachment_not_found')], 404);
        }

        $mime = Storage::mimeType($transaction->attachment_path);
        $contents = Storage::get($transaction->attachment_path);

        return response($contents, 200)->header('Content-Type', $mime);
    }

    /**
     * @OA\Delete(
     *     path="/api/transactions/{id}/attachment",
     *     tags={"Transactions"},
     *     summary="Delete a transaction attachment",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Attachment deleted")
     * )
     */
    public function deleteAttachment($id)
    {
        $transaction = Transaction::findOrFail($id);
        $this->authorize('update', $transaction);

        if (! $transaction->attachment_path) {
            return response()->json(['message' => __('messages.no_attachment')], 404);
        }

        Storage::delete($transaction->attachment_path);
        $transaction->update(['attachment_path' => null]);

        return response()->json(['message' => __('messages.attachment_deleted')]);
    }

    /**
     * The user's transactions with the shared list/export filters applied.
     */
    private function filteredQuery(Request $request)
    {
        $query = $request->user()
            ->transactions()
            ->with(['category', 'tags'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $term = '%'.$request->search.'%';
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', $term)
                    ->orWhere('notes', 'like', $term);
            });
        }
        if ($request->filled('notes_search')) {
            $query->where('notes', 'like', '%'.$request->notes_search.'%');
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }
        if ($request->filled('amount_min')) {
            $query->where('amount', '>=', $request->amount_min);
        }
        if ($request->filled('amount_max')) {
            $query->where('amount', '<=', $request->amount_max);
        }
        if ($request->filled('tag_ids')) {
            $tagIds = array_filter(array_map('intval', explode(',', $request->tag_ids)));
            foreach ($tagIds as $tagId) {
                $query->whereHas('tags', fn ($q) => $q->where('tags.id', $tagId));
            }
        }

        return $query;
    }

    /**
     * Quote a CSV cell and neutralise values a spreadsheet would run as a formula.
     */
    private function csvCell(string $value): string
    {
        if ($value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            $value = "'".$value;
        }

        return '"'.str_replace('"', '""', $value).'"';
    }

    private function resolveTagIds(Request $request): array
    {
        $raw = $request->input('tag_ids', []);
        if (is_string($raw)) {
            $raw = array_filter(array_map('intval', explode(',', $raw)));
        }
        $userId = $request->user()->id;

        return Tag::whereIn('id', $raw)->where('user_id', $userId)->pluck('id')->toArray();
    }

    /**
     * @OA\Get(
     *     path="/api/transactions/export",
     *     tags={"Transactions"},
     *     summary="Export transactions as CSV",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="CSV file")
     * )
     */
    public function export(ExportTransactionRequest $request)
    {
        $query = $this->filteredQuery($request);

        $transactions = $query->get();

        $lines = ['Date,Description,Category,Type,Amount,Notes,Tags'];
        foreach ($transactions as $t) {
            $tagNames = $t->tags->pluck('name')->implode(';');
            $lines[] = implode(',', [
                $t->transaction_date->format('Y-m-d'),
                $this->csvCell($t->description),
                $this->csvCell($t->category?->name ?? ''),
                $t->type,
                $t->amount,
                $this->csvCell($t->notes ?? ''),
                $this->csvCell($tagNames),
            ]);
        }

        $csv = implode("\n", $lines);
        $filename = 'transactions-'.date('Y-m-d').'.csv';

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/transactions/expenses-by-category",
     *     tags={"Transactions"},
     *     summary="Get expenses grouped by category for a month",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string", example="2025-07")),
     *
     *     @OA\Response(response=200, description="Expenses by category")
     * )
     */
    public function expensesByCategory(ExpensesByCategoryRequest $request)
    {
        $month = $request->query('month', date('Y-m'));

        [$year, $mon] = explode('-', $month);

        /** @var User $user */
        $user = $request->user();
        $byCategory = fn (int $y, int $m) => $user
            ->transactions()
            ->with('category')
            ->where('type', 'expense')
            ->whereYear('transaction_date', $y)
            ->whereMonth('transaction_date', $m)
            ->get()
            ->groupBy(fn ($t) => $t->category?->name ?? 'Uncategorised');

        $previousMonth = Carbon::create((int) $year, (int) $mon, 1)->subMonthNoOverflow();
        $previous = $byCategory($previousMonth->year, $previousMonth->month)->map(fn ($group) => $group->sum('amount'));

        $results = $byCategory((int) $year, (int) $mon)
            ->map(function ($group, $name) use ($previous) {
                $total = round($group->sum('amount'), 2);
                $before = round((float) ($previous[$name] ?? 0), 2);

                return [
                    'category' => $name,
                    'color' => $group->first()->category?->color ?? '#94a3b8',
                    'total' => $total,
                    'previous_total' => $before,
                    // null when last month had nothing in this category to compare against
                    'change_pct' => $before > 0 ? round(($total - $before) / $before * 100, 1) : null,
                ];
            })
            ->values()
            ->sortByDesc('total')
            ->values();

        return response()->json($results);
    }
}
