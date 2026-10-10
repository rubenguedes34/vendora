<?php

namespace App\Http\Requests\Tag;

use App\Http\Requests\RecordRequest;
use App\Models\Tag;

/**
 * @extends RecordRequest<Tag>
 */
class UpdateTagRequest extends RecordRequest
{
    public function rules(): array
    {
        return [
            'name'  => 'sometimes|required|string|max:50',
            'color' => 'nullable|string|max:20',
        ];
    }

    protected function findRecord(): Tag
    {
        return Tag::findOrFail($this->route('tag'));
    }
}
