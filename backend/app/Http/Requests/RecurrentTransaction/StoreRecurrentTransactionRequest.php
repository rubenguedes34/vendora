<?php

namespace App\Http\Requests\RecurrentTransaction;

use Illuminate\Foundation\Http\FormRequest;

class StoreRecurrentTransactionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'type' => 'required|in:income,expense',
            'category_id' => 'required|exists:categories,id',
            'day_of_month' => 'required|integer|between:1,28',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
