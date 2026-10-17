<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLocaleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'locale' => 'required|in:en,pt',
        ];
    }
}
