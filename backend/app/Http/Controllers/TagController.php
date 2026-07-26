<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Tag;

class TagController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/tags",
     *     tags={"Tags"},
     *     summary="List all tags",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Array of tags")
     * )
     */
    public function index(Request $request)
    {
        $tags = $request->user()->tags()->orderBy('name')->get();
        return response()->json($tags);
    }

    /**
     * @OA\Post(
     *     path="/api/tags",
     *     tags={"Tags"},
     *     summary="Create a tag",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"name"},
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="color", type="string")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Tag created")
     * )
     */
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

    /**
     * @OA\Put(
     *     path="/api/tags/{tag}",
     *     tags={"Tags"},
     *     summary="Update a tag",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="tag", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="color", type="string")
     *         )
     *     ),
     *     @OA\Response(response=200, description="Tag updated")
     * )
     */
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

    /**
     * @OA\Delete(
     *     path="/api/tags/{tag}",
     *     tags={"Tags"},
     *     summary="Delete a tag",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="tag", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Tag deleted")
     * )
     */
    public function destroy(Request $request, $id)
    {
        $tag = $request->user()->tags()->findOrFail($id);
        $tag->delete();

        return response()->json(['message' => 'Tag deleted']);
    }
}
