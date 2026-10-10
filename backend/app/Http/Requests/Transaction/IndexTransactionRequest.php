<?php

namespace App\Http\Requests\Transaction;

class IndexTransactionRequest extends ExportTransactionRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            'per_page'     => 'nullable|integer|in:10,20,50,100',
            'page'         => 'nullable|integer|min:1',
        ];
    }
}
