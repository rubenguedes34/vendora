<?php

namespace App\Http\Requests\Transaction;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransactionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'category_id' => 'required|exists:categories,id',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'type' => 'required|in:income,expense',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string|max:1000',
            'tag_ids' => 'nullable|array',
            'tag_ids.*' => [
                'integer',
                Rule::exists('tags', 'id')->where('user_id', $this->user()->id),
            ],
            'attachment' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:'.config('vendora.max_upload_kb'),
        ];
    }
}
