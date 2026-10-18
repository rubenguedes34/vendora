<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\StatementImport;
use App\Models\User;
use App\Services\PdfTextExtractor;
use App\Services\TokenService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class StatementImportHistoryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private array $headers;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        /** @var User $admin */
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        $this->admin = $admin;
        $this->headers = ['Authorization' => 'Bearer '.TokenService::issue($admin), 'Accept' => 'application/json'];

        $text = file_get_contents(__DIR__.'/../fixtures/activobank-statement.txt');
        $this->app->bind(PdfTextExtractor::class, fn () => new class($text) implements PdfTextExtractor
        {
            public function __construct(private string $text) {}

            public function extract(string $path): string
            {
                return $this->text;
            }
        });
    }

    private function upload(): array
    {
        $file = UploadedFile::fake()->createWithContent('s.pdf', 'fake-pdf-bytes-1');

        return $this->post('/api/transactions/import/preview', ['file' => $file], $this->headers)->assertOk()->json();
    }

    private function statement(array $override = []): array
    {
        return $override + ['hash' => hash('sha256', 'fake-pdf-bytes-1'), 'from' => '2026-03-01', 'to' => '2026-03-31'];
    }

    private function row(): array
    {
        $cat = Category::firstOrCreate(['name' => 'Food', 'type' => 'expense']);

        return ['date' => '2026-03-04', 'description' => 'X', 'amount' => 5, 'type' => 'expense', 'category_id' => $cat->id];
    }

    public function test_preview_returns_the_file_hash_and_no_previous_import_the_first_time(): void
    {
        $preview = $this->upload();

        $this->assertSame(hash('sha256', 'fake-pdf-bytes-1'), $preview['file_hash']);
        $this->assertNull($preview['previous_import']);
    }

    public function test_importing_with_a_statement_stores_a_light_record_and_the_next_preview_warns(): void
    {
        $this->postJson('/api/transactions/import', ['statement' => $this->statement(), 'rows' => [$this->row(), $this->row()]], $this->headers)
            ->assertStatus(201);

        $record = StatementImport::first();
        $this->assertSame($this->admin->id, $record->user_id);
        $this->assertSame(2, $record->rows_imported);
        $this->assertSame(hash('sha256', 'fake-pdf-bytes-1'), $record->file_hash);

        $again = $this->upload();
        $this->assertSame(2, $again['previous_import']['rows_imported']);
        $this->assertNotNull($again['previous_import']['imported_at']);
    }

    public function test_the_statement_block_is_optional_and_validated(): void
    {
        $this->postJson('/api/transactions/import', ['rows' => [$this->row()]], $this->headers)->assertStatus(201);
        $this->assertSame(0, StatementImport::count());

        $this->postJson('/api/transactions/import', ['statement' => $this->statement(['hash' => 'not-a-hash']), 'rows' => [$this->row()]], $this->headers)
            ->assertStatus(422);
    }

    public function test_another_users_import_never_shows_up(): void
    {
        /** @var User $other */
        $other = User::factory()->create();
        StatementImport::create(['user_id' => $other->id, 'file_hash' => hash('sha256', 'fake-pdf-bytes-1'), 'period_from' => '2026-03-01', 'period_to' => '2026-03-31', 'rows_imported' => 9]);

        $this->assertNull($this->upload()['previous_import']);
    }
}
