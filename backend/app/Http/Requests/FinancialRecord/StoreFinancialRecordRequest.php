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
            'monthly_income' => 'required|numeric|min:0',
            'monthly_expenses' => 'required|numeric|min:0',
            'savings_goal' => 'nullable|numeric|min:0',
            'savings_goal_type' => 'nullable|in:percentage,fixed',
        ];
    }
}
