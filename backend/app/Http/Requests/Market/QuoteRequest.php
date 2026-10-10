<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class QuoteRequest extends FormRequest
{
    // Symbols are interpolated into provider URLs, so only ticker characters are allowed.
    public const SYMBOL_RULES = ['required', 'string', 'max:20', 'regex:/^[A-Za-z0-9.\-=^]+$/'];

    public function rules(): array
    {
        return ['symbol' => self::SYMBOL_RULES];
    }
}
