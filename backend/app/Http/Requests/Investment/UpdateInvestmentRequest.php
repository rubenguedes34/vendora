<?php

namespace App\Http\Requests\Investment;

use App\Http\Requests\RecordRequest;
use App\Models\Investment;

/**
 * @extends RecordRequest<Investment>
 */
class UpdateInvestmentRequest extends RecordRequest
{
    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:50',
            'account' => 'nullable|string|max:100',
            'initial_amount' => 'sometimes|required|numeric|min:0',
            'current_amount' => 'sometimes|required|numeric|min:0',
            'purchase_date' => 'sometimes|required|date',
            'ticker_symbol' => 'nullable|string|max:20',
            'units' => 'nullable|numeric|min:0',
            'price_per_unit' => 'nullable|numeric|min:0',
        ];
    }

    protected function findRecord(): Investment
    {
        return Investment::findOrFail($this->route('investment'));
    }
}
