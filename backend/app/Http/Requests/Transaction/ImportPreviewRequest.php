<?php

namespace App\Http\Requests\Transaction;

use Illuminate\Foundation\Http\FormRequest;

class ImportPreviewRequest extends FormRequest
{
    public function rules(): array
    {
        return ['file' => 'required|file|mimes:pdf|max:'.config('vendora.max_upload_kb')];
    }
}
