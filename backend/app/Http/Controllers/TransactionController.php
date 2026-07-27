<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use App\Models\Transaction;
use App\Models\Category;
use App\Models\Tag;
use App\Models\User;

class TransactionController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/transactions",
     *     tags={"Transactions"},
     *     summary="List all transactions",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Array of transactions")
     * )
     */
    public function index(Request $request)
    {
        $request->validate([
            'search'       => 'nullable|string|max:100',
            'notes_search' => 'nullable|string|max:100',
            'type'         => 'nullable|in:income,expense',
            'category_id'  => 'nullable|integer|exists:categories,id',
            'date_from'    => 'nullable|date',
            'date_to'      => 'nullable|date|after_or_equal:date_from',
            'amount_min'   => 'nullable|numeric|min:0',
            'amount_max'   => 'nullable|numeric|min:0',
            'tag_ids'      => 'nullable|string',
            'per_page'     => 'nullable|integer|in:10,20,50,100',
            'page'         => 'nullable|integer|min:1',
        ]);

        $query = $request->user()
            ->transactions()
            ->with(['category', 'tags'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', $term)
                  ->orWhere('notes', 'like', $term);
            });
        }
        if ($request->filled('notes_search')) {
            $query->where('notes', 'like', '%' . $request->notes_search . '%');
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
            if (!empty($tagIds)) {
                foreach ($tagIds as $tagId) {
                    $query->whereHas('tags', fn ($q) => $q->where('tags.id', $tagId));
                }
            }
        }

        $perPage = $request->integer('per_page', 20);
        $page    = $request->integer('page', 1);

        return response()->json($query->paginate($perPage, ['*'], 'page', $page));
    }

    /**
     * @OA\Post(
     *     path="/api/transactions",
     *     tags={"Transactions"},
     *     summary="Create a transaction",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"category_id","description","amount","type","transaction_date"},
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="transaction_date", type="string", format="date")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Transaction created")
     * )
     */
    public function store(Request $request)
    {
        $request->validate([
            'category_id'  => 'required|exists:categories,id',
            'description'  => 'required|string|max:255',
            'amount'       => 'required|numeric|min:0',
            'type'         => 'required|in:income,expense',
            'transaction_date' => 'required|date',
            'notes'        => 'nullable|string|max:1000',
            'tag_ids'      => 'nullable|array',
            'tag_ids.*'    => [
                'integer',
                Rule::exists('tags', 'id')->where('user_id', $request->user()->id),
            ],
            'attachment'   => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        // Verify category belongs to user
        Category::findOrFail($request->category_id);

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->storeAs(
                'receipts/' . $request->user()->id,
                Str::uuid() . '.' . $request->file('attachment')->getClientOriginalExtension()
            );
        }

        $transaction = $request->user()->transactions()->create([
            'category_id'     => $request->category_id,
            'description'     => $request->description,
            'amount'          => $request->amount,
            'type'            => $request->type,
            'transaction_date' => $request->transaction_date,
            'notes'           => $request->notes,
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
     *     @OA\Parameter(name="transaction", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Transaction object")
     * )
     */
    public function show(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->with(['category', 'tags'])->findOrFail($id);
        return response()->json($transaction);
    }

    /**
     * @OA\Put(
     *     path="/api/transactions/{transaction}",
     *     tags={"Transactions"},
     *     summary="Update a transaction",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="transaction", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="category_id", type="integer"),
     *             @OA\Property(property="description", type="string"),
     *             @OA\Property(property="amount", type="number"),
     *             @OA\Property(property="type", type="string", enum={"income","expense"}),
     *             @OA\Property(property="transaction_date", type="string", format="date"),
     *             @OA\Property(property="notes", type="string"),
     *             @OA\Property(property="tag_ids", type="array", @OA\Items(type="integer"))
     *         )
     *     ),
     *     @OA\Response(response=200, description="Transaction updated")
     * )
     */
    public function update(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);

        $request->validate([
            'category_id'  => 'sometimes|required|exists:categories,id',
            'description'  => 'sometimes|required|string|max:255',
            'amount'       => 'sometimes|required|numeric|min:0',
            'type'         => 'sometimes|required|in:income,expense',
            'transaction_date' => 'sometimes|required|date',
            'notes'        => 'nullable|string|max:1000',
            'tag_ids'      => 'nullable|array',
            'tag_ids.*'    => [
                'integer',
                Rule::exists('tags', 'id')->where('user_id', $request->user()->id),
            ],
            'attachment'   => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        if ($request->has('category_id')) {
            Category::findOrFail($request->category_id);
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
                'receipts/' . $request->user()->id,
                Str::uuid() . '.' . $request->file('attachment')->getClientOriginalExtension()
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
     *     @OA\Parameter(name="transaction", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Transaction deleted")
     * )
     */
    public function destroy(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);

        if ($transaction->attachment_path) {
            Storage::delete($transaction->attachment_path);
        }

        $transaction->delete();

        return response()->json(['message' => 'Transaction deleted']);
    }

    /**
     * @OA\Get(
     *     path="/api/transactions/{id}/attachment",
     *     tags={"Transactions"},
     *     summary="Serve a transaction attachment",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Attachment file")
     * )
     */
    public function serveAttachment(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);

        if (!$transaction->attachment_path || !Storage::exists($transaction->attachment_path)) {
            return response()->json(['message' => 'Attachment not found'], 404);
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
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Attachment deleted")
     * )
     */
    public function deleteAttachment(Request $request, $id)
    {
        $transaction = $request->user()->transactions()->findOrFail($id);

        if (!$transaction->attachment_path) {
            return response()->json(['message' => 'No attachment to delete'], 404);
        }

        Storage::delete($transaction->attachment_path);
        $transaction->update(['attachment_path' => null]);

        return response()->json(['message' => 'Attachment deleted']);
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
     *     @OA\Response(response=200, description="CSV file")
     * )
     */
    public function export(Request $request)
    {
        $request->validate([
            'search'       => 'nullable|string|max:100',
            'notes_search' => 'nullable|string|max:100',
            'type'         => 'nullable|in:income,expense',
            'category_id'  => 'nullable|integer|exists:categories,id',
            'date_from'    => 'nullable|date',
            'date_to'      => 'nullable|date|after_or_equal:date_from',
            'amount_min'   => 'nullable|numeric|min:0',
            'amount_max'   => 'nullable|numeric|min:0',
            'tag_ids'      => 'nullable|string',
        ]);

        $query = $request->user()
            ->transactions()
            ->with(['category', 'tags'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', $term)
                  ->orWhere('notes', 'like', $term);
            });
        }
        if ($request->filled('notes_search')) $query->where('notes', 'like', '%' . $request->notes_search . '%');
        if ($request->filled('type'))         $query->where('type', $request->type);
        if ($request->filled('category_id'))  $query->where('category_id', $request->category_id);
        if ($request->filled('date_from'))    $query->whereDate('transaction_date', '>=', $request->date_from);
        if ($request->filled('date_to'))      $query->whereDate('transaction_date', '<=', $request->date_to);
        if ($request->filled('amount_min'))   $query->where('amount', '>=', $request->amount_min);
        if ($request->filled('amount_max'))   $query->where('amount', '<=', $request->amount_max);
        if ($request->filled('tag_ids')) {
            $tagIds = array_filter(array_map('intval', explode(',', $request->tag_ids)));
            foreach ($tagIds as $tagId) {
                $query->whereHas('tags', fn ($q) => $q->where('tags.id', $tagId));
            }
        }

        $transactions = $query->get();

        $lines = ["Date,Description,Category,Type,Amount,Notes,Tags"];
        foreach ($transactions as $t) {
            $tagNames = $t->tags->pluck('name')->implode(';');
            $lines[] = implode(',', [
                $t->transaction_date,
                '"' . str_replace('"', '""', $t->description) . '"',
                '"' . str_replace('"', '""', $t->category?->name ?? '') . '"',
                $t->type,
                $t->amount,
                '"' . str_replace('"', '""', $t->notes ?? '') . '"',
                '"' . str_replace('"', '""', $tagNames) . '"',
            ]);
        }

        $csv = implode("\n", $lines);
        $filename = 'transactions-' . date('Y-m-d') . '.csv';

        return response($csv, 200, [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/transactions/expenses-by-category",
     *     tags={"Transactions"},
     *     summary="Get expenses grouped by category for a month",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string", example="2025-07")),
     *     @OA\Response(response=200, description="Expenses by category")
     * )
     */
    public function expensesByCategory(Request $request)
    {
        $request->validate(['month' => ['nullable', 'regex:/^\d{4}-\d{2}$/']]);

        $month = $request->query('month', date('Y-m'));

        [$year, $mon] = explode('-', $month);

        /** @var User $user */
        $user = $request->user();
        $results = $user
            ->transactions()
            ->with('category')
            ->where('type', 'expense')
            ->whereYear('transaction_date', (int) $year)
            ->whereMonth('transaction_date', (int) $mon)
            ->get()
            ->groupBy(fn ($t) => $t->category?->name ?? 'Uncategorised')
            ->map(fn ($group, $name) => [
                'category' => $name,
                'color'    => $group->first()->category?->color ?? '#94a3b8',
                'total'    => round($group->sum('amount'), 2),
            ])
            ->values()
            ->sortByDesc('total')
            ->values();

        return response()->json($results);
    }
}
