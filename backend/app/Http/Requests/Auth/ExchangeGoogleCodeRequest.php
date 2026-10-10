<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ExchangeGoogleCodeRequest extends FormRequest
{
    public function rules(): array
    {
        return ['code' => 'required|string|size:64'];
    }
}
