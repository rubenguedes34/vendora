<?php

namespace App\Http\Requests\AlertRule;

use App\Http\Requests\RecordRequest;
use App\Models\AlertRule;

/**
 * Only the limit and the on/off switch change; to monitor something else, create a new rule.
 *
 * @extends RecordRequest<AlertRule>
 */
class UpdateAlertRuleRequest extends RecordRequest
{
    public function rules(): array
    {
        return [
            'threshold' => 'sometimes|required|numeric|min:0.01|max:99999999.99|decimal:0,2',
            'is_active' => 'sometimes|boolean',
        ];
    }

    protected function findRecord(): AlertRule
    {
        return AlertRule::findOrFail($this->route('alert_rule'));
    }
}
