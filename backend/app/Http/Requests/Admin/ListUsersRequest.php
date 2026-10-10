<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ListUsersRequest extends FormRequest
{
    public function rules(): array
    {
        return ['search' => 'nullable|string|max:100'];
    }
}
