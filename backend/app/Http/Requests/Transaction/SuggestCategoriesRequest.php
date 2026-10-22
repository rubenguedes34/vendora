<?php

namespace App\Http\Requests\Transaction;

use Illuminate\Foundation\Http\FormRequest;

class SuggestCategoriesRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'rows' => 'required|array|min:1|max:100',
            'rows.*.description' => 'required|string|max:255',
            'rows.*.type' => 'required|in:income,expense',
        ];
    }
}
