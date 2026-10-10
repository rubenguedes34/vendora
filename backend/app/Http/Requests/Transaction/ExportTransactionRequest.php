<?php

namespace App\Http\Requests\Transaction;

use Illuminate\Foundation\Http\FormRequest;

/**
 * The filters shared by the transaction list and its CSV export.
 */
class ExportTransactionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'search'       => 'nullable|string|max:100',
            'notes_search' => 'nullable|string|max:100',
            'type'         => 'nullable|in:income,expense',
            'category_id'  => 'nullable|integer|exists:categories,id',
            'date_from'    => 'nullable|date',
            'date_to'      => 'nullable|date|after_or_equal:date_from',
            'amount_min'   => 'nullable|numeric|min:0',
            'amount_max'   => 'nullable|numeric|min:0',
            'tag_ids'      => 'nullable|string',
        ];
    }
}
