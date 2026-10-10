<?php

namespace App\Http\Requests\Setup;

use Illuminate\Foundation\Http\FormRequest;

class StoreSetupRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'token' => 'required|string|max:4096',
            'monthly_income' => 'required|numeric|min:0|max:99999999.99|decimal:0,2',
            'monthly_expenses' => 'required|numeric|min:0|max:99999999.99|decimal:0,2',
        ];
    }
}
