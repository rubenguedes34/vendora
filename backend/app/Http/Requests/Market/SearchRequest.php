<?php

namespace App\Http\Requests\Market;

use Illuminate\Foundation\Http\FormRequest;

class SearchRequest extends FormRequest
{
    public function rules(): array
    {
        return ['q' => 'required|string|max:60'];
    }
}
