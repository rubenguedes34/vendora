<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = $request->user()
            ->categories()
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'type' => 'required|in:income,expense',
        ]);

        $category = $request->user()->categories()->create($request->all());

        return response()->json($category, 201);
    }

    public function show(Request $request, $id)
    {
        $category = $request->user()->categories()->findOrFail($id);
        return response()->json($category);
    }

    public function update(Request $request, $id)
    {
        $category = $request->user()->categories()->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'type' => 'sometimes|required|in:income,expense',
        ]);

        $category->update($request->all());

        return response()->json($category);
    }

    public function destroy(Request $request, $id)
    {
        $category = $request->user()->categories()->findOrFail($id);
        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }
}
