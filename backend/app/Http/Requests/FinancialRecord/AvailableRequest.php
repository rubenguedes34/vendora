<?php

namespace App\Http\Requests\FinancialRecord;

use Illuminate\Foundation\Http\FormRequest;

class AvailableRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'month' => 'nullable|date_format:Y-m',
        ];
    }

    /**
     * The requested month, or the current one.
     *
     * @return array{int, int} year, month
     */
    public function period(): array
    {
        return $this->filled('month')
            ? array_map('intval', explode('-', $this->month))
            : [(int) date('Y'), (int) date('n')];
    }
}
