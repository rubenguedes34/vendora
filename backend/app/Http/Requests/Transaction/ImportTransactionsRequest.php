<?php

namespace App\Http\Requests\Transaction;

use Illuminate\Foundation\Http\FormRequest;

class ImportTransactionsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'statement' => 'nullable|array',
            'statement.hash' => 'required_with:statement|string|regex:/^[a-f0-9]{64}$/',
            'statement.from' => 'required_with:statement|date_format:Y-m-d',
            'statement.to' => 'required_with:statement|date_format:Y-m-d|after_or_equal:statement.from',
            'rows' => 'required|array|min:1|max:500',
            'rows.*.date' => 'required|date_format:Y-m-d',
            'rows.*.description' => 'required|string|max:255',
            'rows.*.notes' => 'nullable|string|max:1000',
            'rows.*.amount' => 'required|numeric|min:0.01',
            'rows.*.type' => 'required|in:income,expense',
            'rows.*.category_id' => 'required|exists:categories,id',
        ];
    }
}
