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
            'monthly_income' => 'sometimes|required|numeric|min:0',
            'monthly_expenses' => 'sometimes|required|numeric|min:0',
            'savings_goal' => 'sometimes|nullable|numeric|min:0',
            'savings_goal_type' => 'sometimes|nullable|in:percentage,fixed',
        ];
    }

    protected function findRecord(): FinancialRecord
    {
        return FinancialRecord::findOrFail($this->route('financial_record'));
    }
}
