<?php

namespace App\Http\Requests\Transaction;

use Illuminate\Foundation\Http\FormRequest;

class ExpensesByCategoryRequest extends FormRequest
{
    public function rules(): array
    {
        return ['month' => ['nullable', 'regex:/^\d{4}-\d{2}$/']];
    }
}
