<?php

namespace App\Http\Requests\FinancialRecord;

use Illuminate\Foundation\Http\FormRequest;

class StoreFinancialRecordRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'year' => 'required|integer|between:2000,2100',
            'month' => 'required|integer|between:1,12',
            // Accepted for older clients but ignored: the month is its base plus its transactions.
            'monthly_income' => 'sometimes|nullable|numeric|min:0',
            'monthly_expenses' => 'sometimes|nullable|numeric|min:0',
            'is_custom' => 'sometimes|boolean',
            'base_income' => 'sometimes|nullable|numeric|min:0|max:99999999.99',
            'base_expenses' => 'sometimes|nullable|numeric|min:0|max:99999999.99',
            'savings_goal' => 'nullable|numeric|min:0',
            'savings_goal_type' => 'nullable|in:percentage,fixed',
        ];
    }
}
