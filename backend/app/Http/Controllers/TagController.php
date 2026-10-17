<?php

namespace App\Http\Controllers;

use App\Http\Requests\Tag\StoreTagRequest;
use App\Http\Requests\Tag\UpdateTagRequest;
use App\Models\Tag;
use Illuminate\Http\Request;

class TagController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/tags",
     *     tags={"Tags"},
     *     summary="List all tags",
     *     security={{"bearerAuth":{}}},
     *
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
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"name"},
     *
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="color", type="string")
     *         )
     *     ),
     *
     *     @OA\Response(response=201, description="Tag created")
     * )
     */
    public function store(StoreTagRequest $request)
    {
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
     *
     *     @OA\Parameter(name="tag", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(
     *
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="color", type="string")
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Tag updated")
     * )
     */
    public function update(UpdateTagRequest $request)
    {
        $tag = $request->record();

        $tag->update($request->only(['name', 'color']));

        return response()->json($tag);
    }

    /**
     * @OA\Delete(
     *     path="/api/tags/{tag}",
     *     tags={"Tags"},
     *     summary="Delete a tag",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="tag", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Tag deleted")
     * )
     */
    public function destroy($id)
    {
        $tag = Tag::findOrFail($id);
        $this->authorize('delete', $tag);

        $tag->delete();

        return response()->json(['message' => __('messages.tag_deleted')]);
    }
}
