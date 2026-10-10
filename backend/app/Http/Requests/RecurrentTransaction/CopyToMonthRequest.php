<?php

namespace App\Http\Requests\RecurrentTransaction;

use Illuminate\Foundation\Http\FormRequest;

class CopyToMonthRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'month' => 'required|date_format:Y-m',
        ];
    }
}
