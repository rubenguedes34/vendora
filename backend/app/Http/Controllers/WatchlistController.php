<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class WatchlistController extends Controller
{
    public function index(Request $request)
    {
        $items = $request->user()
            ->watchlistItems()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($items);
    }

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

    public function destroy(Request $request, $id)
    {
        $item = $request->user()->watchlistItems()->findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Removed from watchlist']);
    }
}
