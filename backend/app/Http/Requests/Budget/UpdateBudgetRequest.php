<?php

namespace App\Http\Requests\Budget;

use App\Http\Requests\RecordRequest;
use App\Models\Budget;

/**
 * @extends RecordRequest<Budget>
 */
class UpdateBudgetRequest extends RecordRequest
{
    public function rules(): array
    {
        return [
            'category_id' => 'sometimes|required|exists:categories,id',
            'amount' => 'sometimes|required|numeric|min:0',
            'month' => 'sometimes|required|date_format:Y-m',
        ];
    }

    protected function findRecord(): Budget
    {
        return Budget::findOrFail($this->route('budget'));
    }
}
