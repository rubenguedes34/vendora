<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class InvestmentsMetricsRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'year' => 'nullable|digits:4',
            'type' => 'nullable|string|max:50',
            'search' => 'nullable|string|max:100',
        ];
    }
}
