<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class BudgetsMetricsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'year' => 'nullable|digits:4',
            'month' => 'nullable|date_format:Y-m',
            'search' => 'nullable|string|max:100',
        ];
    }
}
