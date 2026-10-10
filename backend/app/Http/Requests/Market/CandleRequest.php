<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class CandleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'symbol' => QuoteRequest::SYMBOL_RULES,
            'days'   => 'nullable|integer|between:1,365',
        ];
    }
}
