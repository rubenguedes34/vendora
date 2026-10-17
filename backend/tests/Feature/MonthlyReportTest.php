<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Services\TokenService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthlyReportTest extends TestCase
{
    use RefreshDatabase;

    private array $headers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $user = User::factory()->create(['monthly_income' => 1000, 'monthly_expenses' => 600]);
        $user->assignRole('premium');
        $this->headers = ['Authorization' => 'Bearer '.TokenService::issue($user)];
        $user->transactions()->create([
            'category_id' => Category::create(['name' => 'Food', 'type' => 'expense'])->id,
            'description' => '<b>Lunch</b>',
            'amount' => 12.5,
            'type' => 'expense',
            'transaction_date' => '2026-10-02',
        ]);
    }

    public function test_downloads_a_pdf_named_after_the_month(): void
    {
        $response = $this->get('/api/reports/monthly?month=2026-10&symbol=%24', $this->headers)->assertOk();

        $this->assertSame('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('vendora-2026-10.pdf', $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_rejects_a_bad_month_a_long_symbol_and_anonymous_calls(): void
    {
        $this->getJson('/api/reports/monthly?month=2026-13', $this->headers)->assertStatus(422);
        $this->getJson('/api/reports/monthly?symbol=toolong', $this->headers)->assertStatus(422);
        $this->getJson('/api/reports/monthly')->assertStatus(401);
    }

    public function test_a_plain_user_cannot_download_the_report(): void
    {
        $plain = User::factory()->create();
        $plain->assignRole('user');

        $this->getJson('/api/reports/monthly', ['Authorization' => 'Bearer '.TokenService::issue($plain)])
            ->assertStatus(403);
    }
}
