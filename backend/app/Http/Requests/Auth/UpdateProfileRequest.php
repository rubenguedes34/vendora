<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,'.$this->user()->id,
            'monthly_income' => 'nullable|numeric|min:0|max:99999999.99|decimal:0,2',
            'monthly_expenses' => 'nullable|numeric|min:0|max:99999999.99|decimal:0,2',
            'current_password' => 'nullable|string|max:72',
        ];
    }
}
