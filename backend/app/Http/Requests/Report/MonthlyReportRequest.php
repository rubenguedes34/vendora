<?php

namespace App\Http\Requests\Report;

use App\Http\Requests\FinancialRecord\AvailableRequest;

class MonthlyReportRequest extends AvailableRequest
{
    public function rules(): array
    {
        return parent::rules() + [
            // The currency is a frontend preference, so the SPA tells the report which symbol to print.
            'symbol' => 'nullable|string|max:4',
        ];
    }
}
