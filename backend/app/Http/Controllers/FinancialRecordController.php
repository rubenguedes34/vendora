<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use App\Models\FinancialRecord;

class FinancialRecordController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/financial-records",
     *     tags={"Financial Records"},
     *     summary="List all financial records",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Array of financial records")
     * )
     */
    public function index(Request $request)
    {
        $records = $request->user()
            ->financialRecords()
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get();

        return response()->json($records);
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/current",
     *     tags={"Financial Records"},
     *     summary="Get current month financial record",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Current month record")
     * )
     */
    public function current(Request $request)
    {
        $record = $request->user()
            ->financialRecords()
            ->where('year', date('Y'))
            ->where('month', date('n'))
            ->first();

        if (!$record) {
            $record = new FinancialRecord([
                'user_id' => $request->user()->id,
                'year' => date('Y'),
                'month' => date('n'),
                'monthly_income' => $request->user()->monthly_income,
                'monthly_expenses' => $request->user()->monthly_expenses,
                'savings_goal' => 0,
                'savings_goal_type' => 'fixed',
            ]);
        }

        return response()->json($record);
    }

    /**
     * @OA\Get(
     *     path="/api/financial-records/year/{year}",
     *     tags={"Financial Records"},
     *     summary="Get financial records for a year",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="year", in="path", required=true, @OA\Schema(type="integer", example=2025)),
     *     @OA\Response(response=200, description="Array of monthly records for the year")
     * )
     */
    public function byYear(Request $request, $year)
    {
        $records = $request->user()
            ->financialRecords()
            ->where('year', $year)
            ->orderBy('month', 'asc')
            ->get();

        return response()->json($records);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'year' => 'required|integer',
                'month' => 'required|integer|between:1,12',
                'monthly_income' => 'required|numeric|min:0',
                'monthly_expenses' => 'required|numeric|min:0',
                'savings_goal' => 'nullable|numeric|min:0',
                'savings_goal_type' => 'nullable|in:percentage,fixed',
            ]);

            $record = $request->user()->financialRecords()->updateOrCreate(
                [
                    'year' => $request->year,
                    'month' => $request->month,
                ],
                [
                    'monthly_income' => $request->monthly_income,
                    'monthly_expenses' => $request->monthly_expenses,
                    'savings_goal' => $request->savings_goal ?? 0,
                    'savings_goal_type' => $request->savings_goal_type ?? 'fixed',
                ]
            );

            // Also update the user's default values to the latest record
            $request->user()->update([
                'monthly_income' => $request->monthly_income,
                'monthly_expenses' => $request->monthly_expenses,
            ]);

            return response()->json($record, 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to save financial record: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        $record = $request->user()->financialRecords()->findOrFail($id);
        return response()->json($record);
    }

    public function update(Request $request, $id)
    {
        try {
            $record = $request->user()->financialRecords()->findOrFail($id);

            $request->validate([
                'monthly_income' => 'sometimes|required|numeric|min:0',
                'monthly_expenses' => 'sometimes|required|numeric|min:0',
                'savings_goal' => 'sometimes|nullable|numeric|min:0',
                'savings_goal_type' => 'sometimes|nullable|in:percentage,fixed',
            ]);

            $record->update($request->only([
                'monthly_income',
                'monthly_expenses',
                'savings_goal',
                'savings_goal_type',
            ]));

            // Update user's default values if this is the current month
            if ($record->year == date('Y') && $record->month == date('n')) {
                $request->user()->update([
                    'monthly_income' => $record->monthly_income,
                    'monthly_expenses' => $record->monthly_expenses,
                ]);
            }

            return response()->json($record);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update financial record: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        $record = $request->user()->financialRecords()->findOrFail($id);
        $record->delete();

        return response()->json(['message' => 'Financial record deleted']);
    }
}
