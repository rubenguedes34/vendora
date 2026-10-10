<?php

namespace App\Http\Requests\Admin;

use App\Http\Concerns\AuthorizesWithJsonDenial;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRoleRequest extends FormRequest
{
    use AuthorizesWithJsonDenial;

    public function authorize(): bool
    {
        $this->authorizeOrJson('updateRole', $this->route('user'));

        return true;
    }

    public function rules(): array
    {
        return [
            'role' => 'required|string|in:admin,manager,user',
        ];
    }
}
