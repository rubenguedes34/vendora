<?php

namespace App\Http\Controllers;

use App\Http\Requests\Market\CandleRequest;
use App\Http\Requests\Market\QuoteRequest;
use App\Http\Requests\Market\SearchRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MarketDataController extends Controller
{
    private function finnhubKey(): string
    {
        return (string) config('services.finnhub.key', '');
    }

    /**
     * Cache successful provider responses briefly so repeated lookups do not
     * burn third-party API quota.
     */
    private function cached(string $key, int $seconds, \Closure $resolve): JsonResponse
    {
        $hit = Cache::get($key);
        if ($hit !== null) {
            return response()->json($hit);
        }

        $response = $resolve();
        if ($response->getStatusCode() === 200) {
            Cache::put($key, $response->getData(true), $seconds);
        }

        return $response;
    }

    private function isCrypto(string $symbol): bool
    {
        return str_contains($symbol, '-USD') || str_contains($symbol, '-EUR') || str_contains($symbol, '-BTC');
    }

    /**
     * @OA\Get(
     *     path="/api/market/quote",
     *     tags={"Market Data"},
     *     summary="Get live quote for a symbol",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="symbol", in="query", required=true, @OA\Schema(type="string", example="AAPL")),
     *
     *     @OA\Response(response=200, description="Quote data")
     * )
     */
    // GET /market/quote?symbol=AAPL  or  BTC-USD
    public function quote(QuoteRequest $request)
    {
        $symbol = strtoupper(trim($request->symbol));

        return $this->cached("market:quote:{$symbol}", 60, fn () => $this->isCrypto($symbol)
            ? $this->quoteFromCoinGecko($symbol)
            : $this->quoteFromFinnhub($symbol));
    }

    /**
     * @OA\Get(
     *     path="/api/market/search",
     *     tags={"Market Data"},
     *     summary="Search for market symbols",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="q", in="query", required=true, @OA\Schema(type="string", example="apple")),
     *
     *     @OA\Response(response=200, description="Search results")
     * )
     */
    // GET /market/search?q=apple
    public function search(SearchRequest $request)
    {
        $q = trim($request->q);
        $key = $this->finnhubKey();

        if (! $key) {
            return response()->json(['error' => 'Finnhub API key not configured'], 503);
        }

        try {
            $res = Http::timeout(6)->get('https://finnhub.io/api/v1/search', [
                'q' => $q,
                'token' => $key,
            ]);

            if (! $res->ok()) {
                $this->logProviderError('finnhub', 'search', $res->status());

                return response()->json(['error' => 'Search failed'], 502);
            }

            $results = collect($res->json('result') ?? [])
                ->filter(fn ($r) => in_array($r['type'] ?? '', ['Common Stock', 'ETP', 'ETF']))
                ->take(10)
                ->map(fn ($r) => [
                    'symbol' => $r['symbol'],
                    'name' => $r['description'],
                    'type' => in_array($r['type'] ?? '', ['ETP', 'ETF']) ? 'ETF' : 'Stocks',
                    'exchange' => $r['primaryExchange'] ?? '',
                ])
                ->values();

            return response()->json($results);
        } catch (\Exception $e) {
            $this->logFailure('Market search failed', $e);

            return response()->json(['error' => 'Search failed'], 500);
        }
    }

    /**
     * @OA\Get(
     *     path="/api/market/candle",
     *     tags={"Market Data"},
     *     summary="Get candle/sparkline data for a symbol",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="symbol", in="query", required=true, @OA\Schema(type="string", example="AAPL")),
     *     @OA\Parameter(name="days", in="query", required=false, @OA\Schema(type="integer", example=7)),
     *
     *     @OA\Response(response=200, description="Sparkline data")
     * )
     */
    // GET /market/candle?symbol=AAPL&days=7
    public function candle(CandleRequest $request)
    {
        $symbol = strtoupper(trim($request->symbol));
        $days = $request->integer('days', 7);
        $key = $this->finnhubKey();

        if (! $key) {
            return response()->json(['error' => 'Finnhub API key not configured'], 503);
        }

        $to = time();
        $from = $to - ($days * 24 * 3600);

        try {
            $res = Http::timeout(8)->get('https://finnhub.io/api/v1/stock/candle', [
                'symbol' => $symbol,
                'resolution' => 'D',
                'from' => $from,
                'to' => $to,
                'token' => $key,
            ]);

            $data = $res->json();

            if (($data['s'] ?? '') !== 'ok') {
                $this->logProviderError('finnhub', 'candle', $res->status(), ['symbol' => $symbol]);

                return response()->json(['sparkline' => []]);
            }

            $closes = array_map(fn ($v) => round($v, 4), $data['c'] ?? []);

            return response()->json(['sparkline' => $closes]);
        } catch (\Exception $e) {
            $this->logFailure('Market candle failed', $e, ['symbol' => $symbol]);

            return response()->json(['sparkline' => []]);
        }
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function logProviderError(string $provider, string $endpoint, int $status, array $context = []): void
    {
        Log::channel('market')->warning('Market provider returned error', ['provider' => $provider, 'endpoint' => $endpoint, 'status' => $status] + $context);
    }

    /** Class only: HTTP exception messages quote the request URL, which carries the Finnhub token. */
    private function logFailure(string $message, \Throwable $e, array $context = []): void
    {
        Log::channel('market')->warning($message, ['exception' => $e::class] + $context);
    }

    private function quoteFromFinnhub(string $symbol): JsonResponse
    {
        $key = $this->finnhubKey();

        if (! $key) {
            return $this->quoteFromYahoo($symbol);
        }

        try {
            [$quote, $profile] = [
                Http::timeout(6)->get('https://finnhub.io/api/v1/quote', [
                    'symbol' => $symbol, 'token' => $key,
                ])->json(),
                Http::timeout(6)->get('https://finnhub.io/api/v1/stock/profile2', [
                    'symbol' => $symbol, 'token' => $key,
                ])->json(),
            ];

            $price = round($quote['c'] ?? 0, 4);
            $prev = round($quote['pc'] ?? 0, 4);
            $change24h = $prev > 0 ? round((($price - $prev) / $prev) * 100, 2) : null;

            if ($price <= 0) {
                return $this->quoteFromYahoo($symbol);
            }

            // Fetch 7-day candle for sparkline
            $sparkline = $this->fetchFinnhubSparkline($symbol, $key, 7);

            return response()->json([
                'symbol' => $symbol,
                'name' => $profile['name'] ?? $symbol,
                'price' => $price,
                'currency' => $profile['currency'] ?? 'USD',
                'exchange' => $profile['exchange'] ?? '',
                'change_24h' => $change24h,
                'sparkline' => $sparkline,
                'logo' => $profile['logo'] ?? null,
            ]);
        } catch (\Exception $e) {
            $this->logFailure('Finnhub quote failed, falling back to Yahoo', $e, ['symbol' => $symbol]);

            return $this->quoteFromYahoo($symbol);
        }
    }

    private function fetchFinnhubSparkline(string $symbol, string $key, int $days): array
    {
        try {
            $to = time();
            $from = $to - ($days * 24 * 3600);
            $res = Http::timeout(6)->get('https://finnhub.io/api/v1/stock/candle', [
                'symbol' => $symbol, 'resolution' => 'D',
                'from' => $from, 'to' => $to, 'token' => $key,
            ])->json();

            if (($res['s'] ?? '') !== 'ok') {
                return [];
            }

            return array_map(fn ($v) => round($v, 4), $res['c'] ?? []);
        } catch (\Exception $e) {
            $this->logFailure('Finnhub sparkline failed', $e, ['symbol' => $symbol]);

            return [];
        }
    }

    private function quoteFromYahoo(string $symbol): JsonResponse
    {
        try {
            $response = Http::timeout(10)
                ->withHeaders(['User-Agent' => 'Mozilla/5.0'])
                ->get("https://query1.finance.yahoo.com/v8/finance/chart/{$symbol}", [
                    'interval' => '1d', 'range' => '7d',
                ]);

            if (! $response->ok()) {
                $this->logProviderError('yahoo', 'chart', $response->status(), ['symbol' => $symbol]);

                return response()->json(['error' => 'Symbol not found'], 404);
            }

            $data = $response->json();
            $result = $data['chart']['result'][0] ?? null;
            $meta = $result['meta'] ?? null;

            if (! $meta) {
                return response()->json(['error' => 'No data for this symbol'], 404);
            }

            $rawCloses = $result['indicators']['quote'][0]['close'] ?? [];
            $closes = [];
            foreach ($rawCloses as $close) {
                if ($close !== null) {
                    $closes[] = $close;
                }
            }
            $sparkline = array_map(fn ($v) => round($v, 4), $closes);
            $price = round($meta['regularMarketPrice'] ?? 0, 4);
            $prev = $meta['chartPreviousClose'] ?? $meta['previousClose'] ?? null;
            $change24h = $prev && $prev > 0 ? round((($price - $prev) / $prev) * 100, 2) : null;

            return response()->json([
                'symbol' => $symbol,
                'name' => $meta['longName'] ?? $meta['shortName'] ?? $symbol,
                'price' => $price,
                'currency' => $meta['currency'] ?? 'USD',
                'exchange' => $meta['exchangeName'] ?? '',
                'change_24h' => $change24h,
                'sparkline' => $sparkline,
                'logo' => null,
            ]);
        } catch (\Exception $e) {
            $this->logFailure('Yahoo quote failed', $e, ['symbol' => $symbol]);

            return response()->json(['error' => 'Failed to fetch market data'], 500);
        }
    }

    private function quoteFromCoinGecko(string $symbol): JsonResponse
    {
        // e.g. BTC-USD → bitcoin
        $base = strtolower(explode('-', $symbol)[0]);
        $idMap = [
            'btc' => 'bitcoin', 'eth' => 'ethereum', 'sol' => 'solana',
            'bnb' => 'binancecoin', 'xrp' => 'ripple', 'ada' => 'cardano',
            'doge' => 'dogecoin', 'avax' => 'avalanche-2', 'dot' => 'polkadot',
            'matic' => 'matic-network', 'link' => 'chainlink', 'uni' => 'uniswap',
        ];
        $coinId = $idMap[$base] ?? $base;

        try {
            $res = Http::timeout(8)->get("https://api.coingecko.com/api/v3/coins/{$coinId}", [
                'localization' => 'false',
                'tickers' => 'false',
                'market_data' => 'true',
                'community_data' => 'false',
                'sparkline' => 'true',
            ]);

            if (! $res->ok()) {
                $this->logProviderError('coingecko', 'coin', $res->status(), ['symbol' => $symbol]);

                return response()->json(['error' => 'Crypto symbol not found'], 404);
            }

            $coin = $res->json();
            $price = round($coin['market_data']['current_price']['usd'] ?? 0, 6);
            $change24h = round($coin['market_data']['price_change_percentage_24h'] ?? 0, 2);
            $sparkline = array_map(
                fn ($v) => round($v, 6),
                $coin['market_data']['sparkline_7d']['price'] ?? []
            );
            // Downsample to ~14 points
            $step = max(1, (int) (count($sparkline) / 14));
            $sparkline = array_values(array_filter(
                $sparkline,
                fn ($k) => $k % $step === 0,
                ARRAY_FILTER_USE_KEY
            ));

            return response()->json([
                'symbol' => $symbol,
                'name' => $coin['name'] ?? $symbol,
                'price' => $price,
                'currency' => 'USD',
                'exchange' => 'CoinGecko',
                'change_24h' => $change24h,
                'sparkline' => $sparkline,
                'logo' => $coin['image']['small'] ?? null,
            ]);
        } catch (\Exception $e) {
            $this->logFailure('CoinGecko quote failed', $e, ['symbol' => $symbol]);

            return response()->json(['error' => 'Failed to fetch crypto data'], 500);
        }
    }
}
