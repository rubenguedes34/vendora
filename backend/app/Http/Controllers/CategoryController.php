<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Category;

class CategoryController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/categories",
     *     tags={"Categories"},
     *     summary="List all categories",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Array of categories")
     * )
     */
    public function index(Request $request)
    {
        $categories = Category::query()
            ->with(['budgets' => function ($query) use ($request) {
                $query->where('user_id', $request->user()->id)
                    ->where('month', date('Y-m'));
            }])
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    /**
     * @OA\Post(
     *     path="/api/categories",
     *     tags={"Categories"},
     *     summary="Create a category",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"name","type"},
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="icon", type="string"),
     *             @OA\Property(property="color", type="string"),
     *             @OA\Property(property="type", type="string", enum={"income","expense","savings"})
     *         )
     *     ),
     *     @OA\Response(response=201, description="Category created")
     * )
     */
    public function store(Request $request)
    {
        abort(404);
    }

    /**
     * @OA\Get(
     *     path="/api/categories/{category}",
     *     tags={"Categories"},
     *     summary="Get a single category",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="category", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Category object")
     * )
     */
    public function show(Request $request, $id)
    {
        $category = Category::findOrFail($id);
        return response()->json($category);
    }

    /**
     * @OA\Put(
     *     path="/api/categories/{category}",
     *     tags={"Categories"},
     *     summary="Update a category",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="category", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="icon", type="string"),
     *             @OA\Property(property="color", type="string"),
     *             @OA\Property(property="type", type="string", enum={"income","expense","savings"})
     *         )
     *     ),
     *     @OA\Response(response=200, description="Category updated")
     * )
     */
    public function update(Request $request, $id)
    {
        abort(404);
    }

    /**
     * @OA\Delete(
     *     path="/api/categories/{category}",
     *     tags={"Categories"},
     *     summary="Delete a category",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="category", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Category deleted")
     * )
     */
    public function destroy(Request $request, $id)
    {
        abort(404);
    }

    /**
     * @OA\Get(
     *     path="/api/categories-by-type/{type}",
     *     tags={"Categories"},
     *     summary="List categories by type",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="type", in="path", required=true, @OA\Schema(type="string", enum={"income","expense","savings"})),
     *     @OA\Response(response=200, description="Array of categories")
     * )
     */
    public function byType(Request $request, $type)
    {
        $validTypes = ['income', 'expense', 'savings'];

        if (!in_array($type, $validTypes)) {
            return response()->json(['message' => 'Invalid category type'], 400);
        }

        $categories = Category::query()
            ->where('type', $type)
            ->with(['budgets' => function ($query) use ($request) {
                $query->where('user_id', $request->user()->id)
                    ->where('month', date('Y-m'));
            }])
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }
}
