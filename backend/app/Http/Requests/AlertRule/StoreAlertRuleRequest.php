<?php

namespace App\Http\Requests\AlertRule;

use App\Models\AlertRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAlertRuleRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in([AlertRule::TYPE_CATEGORY_LIMIT, AlertRule::TYPE_TOTAL_SPEND_LIMIT])],
            'category_id' => [
                'required_if:type,'.AlertRule::TYPE_CATEGORY_LIMIT,
                'prohibited_if:type,'.AlertRule::TYPE_TOTAL_SPEND_LIMIT,
                'nullable',
                Rule::exists('categories', 'id')->where('type', 'expense'),
            ],
            'threshold' => 'required|numeric|min:0.01|max:99999999.99|decimal:0,2',
            'is_active' => 'sometimes|boolean',
        ];
    }
}
