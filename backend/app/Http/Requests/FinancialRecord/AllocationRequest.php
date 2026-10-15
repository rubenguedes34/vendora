<?php

namespace App\Http\Requests\FinancialRecord;

use Illuminate\Foundation\Http\FormRequest;

class AllocationRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'account' => 'nullable|string|max:100',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
            'type' => 'nullable|string|max:50',
        ];
    }
}
