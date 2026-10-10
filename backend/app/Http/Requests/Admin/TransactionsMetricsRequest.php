<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class TransactionsMetricsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'year' => 'nullable|digits:4',
            'month' => 'nullable|integer|between:1,12',
            'type' => 'nullable|in:income,expense',
            'search' => 'nullable|string|max:100',
        ];
    }
}
