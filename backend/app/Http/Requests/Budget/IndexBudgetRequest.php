<?php

namespace App\Http\Requests\Budget;

use Illuminate\Foundation\Http\FormRequest;

class IndexBudgetRequest extends FormRequest
{
    public function rules(): array
    {
        return ['month' => 'nullable|date_format:Y-m'];
    }
}
