<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Investment;

class InvestmentController extends Controller
{
    public function index(Request $request)
    {
        $investments = $request->user()
            ->investments()
            ->orderBy('purchase_date', 'desc')
            ->get();

        return response()->json($investments);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|max:50',
            'initial_amount' => 'required|numeric|min:0',
            'current_amount' => 'required|numeric|min:0',
            'purchase_date' => 'required|date',
        ]);

        $investment = $request->user()->investments()->create($request->all());

        return response()->json($investment, 201);
    }

    public function show(Request $request, $id)
    {
        $investment = $request->user()->investments()->findOrFail($id);
        return response()->json($investment);
    }

    public function update(Request $request, $id)
    {
        $investment = $request->user()->investments()->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|string|max:50',
            'initial_amount' => 'sometimes|required|numeric|min:0',
            'current_amount' => 'sometimes|required|numeric|min:0',
            'purchase_date' => 'sometimes|required|date',
        ]);

        $investment->update($request->all());

        return response()->json($investment);
    }

    public function destroy(Request $request, $id)
    {
        $investment = $request->user()->investments()->findOrFail($id);
        $investment->delete();

        return response()->json(['message' => 'Investment deleted']);
    }
}
