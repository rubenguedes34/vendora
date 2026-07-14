<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tag;

class TagController extends Controller
{
    public function index(Request $request)
    {
        $tags = $request->user()->tags()->orderBy('name')->get();
        return response()->json($tags);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name'  => 'required|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $tag = $request->user()->tags()->firstOrCreate(
            ['name' => $request->name],
            ['color' => $request->input('color', '#6366f1')]
        );

        return response()->json($tag, 201);
    }

    public function update(Request $request, $id)
    {
        $tag = $request->user()->tags()->findOrFail($id);

        $request->validate([
            'name'  => 'sometimes|required|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        $tag->update($request->only(['name', 'color']));

        return response()->json($tag);
    }

    public function destroy(Request $request, $id)
    {
        $tag = $request->user()->tags()->findOrFail($id);
        $tag->delete();

        return response()->json(['message' => 'Tag deleted']);
    }
}
