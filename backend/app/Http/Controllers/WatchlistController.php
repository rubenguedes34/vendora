<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WatchlistController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/watchlist",
     *     tags={"Watchlist"},
     *     summary="List watchlist items",
     *     security={{"bearerAuth":{}}},
     *     @OA\Response(response=200, description="Array of watchlist items")
     * )
     */
    public function index(Request $request)
    {
        $items = $request->user()
            ->watchlistItems()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($items);
    }

    /**
     * @OA\Post(
     *     path="/api/watchlist",
     *     tags={"Watchlist"},
     *     summary="Add a symbol to the watchlist",
     *     security={{"bearerAuth":{}}},
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"symbol"},
     *             @OA\Property(property="symbol", type="string"),
     *             @OA\Property(property="name", type="string"),
     *             @OA\Property(property="type", type="string"),
     *             @OA\Property(property="exchange", type="string")
     *         )
     *     ),
     *     @OA\Response(response=201, description="Added to watchlist")
     * )
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'symbol'   => 'required|string|max:30',
                'name'     => 'nullable|string|max:255',
                'type'     => 'nullable|string|max:50',
                'exchange' => 'nullable|string|max:100',
            ]);

            $item = $request->user()->watchlistItems()->updateOrCreate(
                ['symbol' => strtoupper(trim($request->symbol))],
                [
                    'name'     => $request->name,
                    'type'     => $request->type,
                    'exchange' => $request->exchange,
                ]
            );

            return response()->json($item, 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to add to watchlist'], 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/watchlist/{watchlist}",
     *     tags={"Watchlist"},
     *     summary="Remove an item from the watchlist",
     *     security={{"bearerAuth":{}}},
     *     @OA\Parameter(name="watchlist", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Removed from watchlist")
     * )
     */
    public function destroy(Request $request, $id)
    {
        $item = $request->user()->watchlistItems()->findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Removed from watchlist']);
    }
}
