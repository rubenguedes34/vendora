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
        $categories = $request->user()
            ->categories()
            ->with(['budgets' => function ($query) {
                $query->where('month', date('Y-m'));
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
        $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'type' => 'required|in:income,expense,savings',
        ]);

        $category = $request->user()->categories()->create($request->all());

        return response()->json($category, 201);
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
        $category = $request->user()->categories()->findOrFail($id);
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
        $category = $request->user()->categories()->findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
            'type' => 'sometimes|required|in:income,expense,savings',
        ]);

        $category->update($request->all());

        return response()->json($category);
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
        $category = $request->user()->categories()->findOrFail($id);
        $category->delete();

        return response()->json(['message' => 'Category deleted']);
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

        $categories = $request->user()
            ->categories()
            ->where('type', $type)
            ->with(['budgets' => function ($query) {
                $query->where('month', date('Y-m'));
            }])
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }
}
