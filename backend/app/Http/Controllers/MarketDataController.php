<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MarketDataController extends Controller
{
    public function quote(Request $request)
    {
        $request->validate(['symbol' => 'required|string|max:20']);

        $symbol = strtoupper(trim($request->symbol));

        try {
            $response = Http::timeout(8)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->get("https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}", [
                    'interval' => '1d',
                    'range'    => '1d',
                ]);

            if (!$response->ok()) {
                return response()->json(['error' => 'Symbol not found'], 404);
            }

            $data   = $response->json();
            $meta   = $data['chart']['result'][0]['meta'] ?? null;

            if (!$meta) {
                return response()->json(['error' => 'No data for this symbol'], 404);
            }

            return response()->json([
                'symbol'    => $symbol,
                'name'      => $meta['longName'] ?? $meta['shortName'] ?? $symbol,
                'price'     => round($meta['regularMarketPrice'] ?? 0, 4),
                'currency'  => $meta['currency'] ?? 'USD',
                'exchange'  => $meta['exchangeName'] ?? '',
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch market data'], 500);
        }
    }
}
