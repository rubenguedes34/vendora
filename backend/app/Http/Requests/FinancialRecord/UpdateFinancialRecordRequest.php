<?php

namespace App\Http\Requests\FinancialRecord;

use App\Http\Requests\RecordRequest;
use App\Models\FinancialRecord;

/**
 * @extends RecordRequest<FinancialRecord>
 */
class UpdateFinancialRecordRequest extends RecordRequest
{
    public function rules(): array
    {
        return [
            // Accepted for older clients but ignored: the month is its base plus its transactions.
            'monthly_income' => 'sometimes|nullable|numeric|min:0',
            'monthly_expenses' => 'sometimes|nullable|numeric|min:0',
            'is_custom' => 'sometimes|boolean',
            'base_income' => 'sometimes|nullable|numeric|min:0|max:99999999.99',
            'base_expenses' => 'sometimes|nullable|numeric|min:0|max:99999999.99',
            'savings_goal' => 'sometimes|nullable|numeric|min:0',
            'savings_goal_type' => 'sometimes|nullable|in:percentage,fixed',
        ];
    }

    protected function findRecord(): FinancialRecord
    {
        return FinancialRecord::findOrFail($this->route('financial_record'));
    }
}
