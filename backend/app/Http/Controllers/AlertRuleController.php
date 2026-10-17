<?php

namespace App\Http\Controllers;

use App\Http\Requests\AlertRule\StoreAlertRuleRequest;
use App\Http\Requests\AlertRule\UpdateAlertRuleRequest;
use App\Models\AlertRule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class AlertRuleController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/alert-rules",
     *     tags={"Alert rules"},
     *     summary="List the user's alert rules",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Array of alert rules")
     * )
     */
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->alertRules()->with('category')->orderBy('id')->get()
        );
    }

    /**
     * @OA\Post(
     *     path="/api/alert-rules",
     *     tags={"Alert rules"},
     *     summary="Create an alert rule",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"type","threshold"},
     *
     *             @OA\Property(property="type", type="string", enum={"category_limit","total_spend_limit"}),
     *             @OA\Property(property="category_id", type="integer", description="Required for category_limit"),
     *             @OA\Property(property="threshold", type="number", description="Monthly spending that triggers the alert"),
     *             @OA\Property(property="is_active", type="boolean")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Alert rule created")
     * )
     */
    public function store(StoreAlertRuleRequest $request)
    {
        $rule = $request->user()->alertRules()->create($request->validated());
        $this->regenerate($request);

        // refresh() so column defaults such as is_active are in the response
        return response()->json($rule->refresh()->load('category'), 201);
    }

    /**
     * @OA\Put(
     *     path="/api/alert-rules/{alert_rule}",
     *     tags={"Alert rules"},
     *     summary="Change an alert rule's limit or switch it on/off",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="alert_rule", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="threshold", type="number"),
     *             @OA\Property(property="is_active", type="boolean")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Alert rule updated")
     * )
     */
    public function update(UpdateAlertRuleRequest $request)
    {
        $rule = $request->record();
        $rule->update($request->validated());
        $this->regenerate($request);

        return response()->json($rule->load('category'));
    }

    /**
     * @OA\Delete(
     *     path="/api/alert-rules/{alert_rule}",
     *     tags={"Alert rules"},
     *     summary="Delete an alert rule",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="alert_rule", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Alert rule deleted")
     * )
     */
    public function destroy($id)
    {
        $rule = AlertRule::findOrFail($id);
        $this->authorize('delete', $rule);

        $rule->delete();

        return response()->json(['message' => __('messages.alert_rule_deleted')]);
    }

    // Notifications are generated at most every 10 minutes; a new or changed rule should apply right away.
    private function regenerate(Request $request): void
    {
        Cache::forget("notifications:generated:{$request->user()->id}");
    }
}
