<?php

namespace Tests\Feature;

use App\Exceptions\StatementParseException;
use App\Models\Category;
use App\Models\User;
use App\Services\PdfTextExtractor;
use App\Services\TokenService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class TransactionImportPreviewTest extends TestCase
{
    use RefreshDatabase;

    private function bindExtractor(string|StatementParseException $result): void
    {
        $this->app->bind(PdfTextExtractor::class, fn () => new class($result) implements PdfTextExtractor
        {
            public function __construct(private string|StatementParseException $result) {}

            public function extract(string $path): string
            {
                if ($this->result instanceof StatementParseException) {
                    throw $this->result;
                }

                return $this->result;
            }
        });
    }

    private function fixture(): string
    {
        return file_get_contents(__DIR__.'/../fixtures/activobank-statement.txt');
    }

    private function headersFor(string $role): array
    {
        $this->seed(RoleSeeder::class);
        /** @var User $user */
        $user = User::factory()->create();
        $user->assignRole($role);

        return ['Authorization' => 'Bearer '.TokenService::issue($user)];
    }

    private function pdf(): UploadedFile
    {
        return UploadedFile::fake()->create('statement.pdf', 100, 'application/pdf');
    }

    public function test_requires_authentication(): void
    {
        $this->post('/api/transactions/import/preview', ['file' => $this->pdf()], ['Accept' => 'application/json'])->assertStatus(401);
    }

    public function test_non_admin_is_forbidden(): void
    {
        $this->bindExtractor($this->fixture());

        $this->post('/api/transactions/import/preview', ['file' => $this->pdf()], $this->headersFor('user') + ['Accept' => 'application/json'])
            ->assertStatus(403);
    }

    public function test_admin_gets_a_preview_and_nothing_is_saved(): void
    {
        $this->bindExtractor($this->fixture());

        $this->post('/api/transactions/import/preview', ['file' => $this->pdf()], $this->headersFor('admin') + ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('period.from', '2026-03-01')
            ->assertJsonPath('period.to', '2026-03-31')
            ->assertJsonPath('reconciliation.ok', true)
            ->assertJsonCount(3, 'rows')
            ->assertJsonPath('rows.0.type', 'income')
            ->assertJsonPath('rows.1.type', 'expense')
            ->assertJsonPath('rows.1.is_duplicate', false);

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_known_description_gets_a_suggested_category(): void
    {
        $this->bindExtractor($this->fixture());
        $headers = $this->headersFor('admin');
        $user = User::latest('id')->first();
        $food = Category::create(['name' => 'Food', 'type' => 'expense']);
        $user->transactions()->create([
            'category_id' => $food->id, 'description' => 'COMPRA 1111 LOJA EXEMPLO LISBOA', 'amount' => 5,
            'type' => 'expense', 'transaction_date' => '2026-02-01',
        ]);

        $this->post('/api/transactions/import/preview', ['file' => $this->pdf()], $headers + ['Accept' => 'application/json'])
            ->assertJsonPath('rows.1.suggested_category_id', $food->id);
    }

    public function test_rejects_non_pdf_and_oversized_files(): void
    {
        $this->bindExtractor($this->fixture());
        $headers = $this->headersFor('admin') + ['Accept' => 'application/json'];

        $this->post('/api/transactions/import/preview', ['file' => UploadedFile::fake()->create('a.txt', 10, 'text/plain')], $headers)->assertStatus(422);
        $this->post('/api/transactions/import/preview', ['file' => UploadedFile::fake()->create('a.pdf', 6000, 'application/pdf')], $headers)->assertStatus(422);
    }

    public function test_upload_size_limit_comes_from_config(): void
    {
        $this->bindExtractor($this->fixture());
        config(['vendora.max_upload_kb' => 1]);

        $this->post('/api/transactions/import/preview', ['file' => UploadedFile::fake()->create('a.pdf', 5, 'application/pdf')], $this->headersFor('admin') + ['Accept' => 'application/json'])
            ->assertStatus(422);
    }

    public function test_parse_failure_returns_422_with_a_code_and_no_statement_text(): void
    {
        $this->bindExtractor(str_replace("SALDO FINAL\t100.00", "SALDO FINAL\t999.00", $this->fixture()));

        $response = $this->post('/api/transactions/import/preview', ['file' => $this->pdf()], $this->headersFor('admin') + ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'balance_mismatch');

        $this->assertStringNotContainsString('MARIA TESTE', $response->getContent());
    }

    public function test_unreadable_pdf_returns_422(): void
    {
        $this->bindExtractor(new StatementParseException('unreadable_pdf'));

        $this->post('/api/transactions/import/preview', ['file' => $this->pdf()], $this->headersFor('admin') + ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'unreadable_pdf');
    }
}
