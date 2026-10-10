<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePasswordRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'current_password'  => 'required|string|max:72',
            'password'          => 'required|string|min:8|max:72|confirmed',
        ];
    }
}
