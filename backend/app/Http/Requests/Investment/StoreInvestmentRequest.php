<?php

namespace App\Http\Requests\Investment;

use Illuminate\Foundation\Http\FormRequest;

class StoreInvestmentRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'account' => 'nullable|string|max:100',
            'initial_amount' => 'required|numeric|min:0',
            'current_amount' => 'required|numeric|min:0',
            'purchase_date' => 'required|date',
            'ticker_symbol' => 'nullable|string|max:20',
            'units' => 'nullable|numeric|min:0',
            'price_per_unit' => 'nullable|numeric|min:0',
        ];
    }
}
