<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MarketDataControllerTest extends TestCase
{
    use RefreshDatabase;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.finnhub.key', '');
        $this->token = TokenService::issue(User::factory()->create());
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_market_endpoints_require_authentication(): void
    {
        $this->getJson('/api/market/quote?symbol=AAPL')->assertStatus(401);
    }

    public function test_quote_returns_yahoo_fallback_data_when_finnhub_is_unconfigured(): void
    {
        Http::fake([
            'query1.finance.yahoo.com/*' => Http::response([
                'chart' => ['result' => [[
                    'meta' => [
                        'regularMarketPrice' => 210.12345,
                        'chartPreviousClose' => 200,
                        'longName' => 'Apple Inc.',
                        'currency' => 'USD',
                        'exchangeName' => 'NASDAQ',
                    ],
                    'indicators' => ['quote' => [['close' => [200.1, null, 210.12345]]]],
                ]]],
            ]),
        ]);

        $this->getJson('/api/market/quote?symbol=aapl', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('symbol', 'AAPL')
            ->assertJsonPath('name', 'Apple Inc.')
            ->assertJsonPath('price', 210.1235)
            ->assertJsonPath('sparkline', [200.1, 210.1235]);
    }

    public function test_crypto_quote_uses_coingecko_and_downsamples_sparkline(): void
    {
        Http::fake([
            'api.coingecko.com/*' => Http::response([
                'name' => 'Bitcoin',
                'image' => ['small' => 'https://example.test/bitcoin.png'],
                'market_data' => [
                    'current_price' => ['usd' => 100000.1234567],
                    'price_change_percentage_24h' => 3.456,
                    'sparkline_7d' => ['price' => range(1, 28)],
                ],
            ]),
        ]);

        $response = $this->getJson('/api/market/quote?symbol=btc-usd', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('symbol', 'BTC-USD')
            ->assertJsonPath('name', 'Bitcoin')
            ->assertJsonPath('exchange', 'CoinGecko');

        $this->assertCount(14, $response->json('sparkline'));
    }

    public function test_search_and_candle_require_a_finnhub_key(): void
    {
        $this->getJson('/api/market/search?q=apple', $this->authHeader())
            ->assertStatus(503)
            ->assertJsonPath('error', 'Finnhub API key not configured');

        $this->getJson('/api/market/candle?symbol=AAPL', $this->authHeader())
            ->assertStatus(503)
            ->assertJsonPath('error', 'Finnhub API key not configured');
    }

    public function test_quote_validates_symbol(): void
    {
        $this->getJson('/api/market/quote', $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['symbol']);
    }
}
