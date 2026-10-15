<?php

namespace App\Http\Requests\Transaction;

use App\Http\Requests\RecordRequest;
use App\Models\Transaction;
use Illuminate\Validation\Rule;

/**
 * @extends RecordRequest<Transaction>
 */
class UpdateTransactionRequest extends RecordRequest
{
    public function rules(): array
    {
        return [
            'category_id' => 'sometimes|required|exists:categories,id',
            'description' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0',
            'type' => 'sometimes|required|in:income,expense',
            'transaction_date' => 'sometimes|required|date',
            'notes' => 'nullable|string|max:1000',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => [
                'integer',
                Rule::exists('tags', 'id')->where('user_id', $this->user()->id),
            ],
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ];
    }

    protected function findRecord(): Transaction
    {
        return Transaction::findOrFail($this->route('transaction'));
    }
}
