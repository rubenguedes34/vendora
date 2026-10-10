<?php

namespace App\Http\Requests\RecurrentTransaction;

use App\Http\Requests\RecordRequest;
use App\Models\RecurrentTransaction;

/**
 * @extends RecordRequest<RecurrentTransaction>
 */
class UpdateRecurrentTransactionRequest extends RecordRequest
{
    public function rules(): array
    {
        return [
            'description' => 'sometimes|required|string|max:255',
            'amount' => 'sometimes|required|numeric|min:0.01',
            'type' => 'sometimes|required|in:income,expense',
            'category_id' => 'sometimes|required|exists:categories,id',
            'day_of_month' => 'sometimes|required|integer|between:1,28',
            'is_active' => 'sometimes|boolean',
        ];
    }

    protected function findRecord(): RecurrentTransaction
    {
        return RecurrentTransaction::findOrFail($this->route('recurrent_transaction'));
    }
}
