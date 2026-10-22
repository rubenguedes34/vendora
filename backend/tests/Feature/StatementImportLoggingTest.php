<?php

namespace Tests\Feature;

use App\Exceptions\StatementParseException;
use App\Models\Category;
use App\Models\User;
use App\Services\PdfTextExtractor;
use App\Services\SmalotPdfTextExtractor;
use App\Services\TokenService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class StatementImportLoggingTest extends TestCase
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
        Log::shouldReceive('channel')->with('import')->atLeast()->once()->andReturnSelf();
        Log::shouldReceive('debug')->zeroOrMoreTimes();
    }

    public function test_parse_failure_is_logged_with_code_and_no_statement_text(): void
    {
        $this->app->bind(PdfTextExtractor::class, fn () => new class implements PdfTextExtractor
        {
            public function extract(string $path): string
            {
                return 'SECRET-STATEMENT-TEXT';
            }
        });
        Log::shouldReceive('warning')->once()->withArgs(
            fn ($msg, $ctx) => $msg === 'Statement parse failed'
                && $ctx['user_id'] === $this->admin->id
                && ! str_contains(json_encode($ctx), 'SECRET-STATEMENT-TEXT')
        );

        $file = UploadedFile::fake()->createWithContent('s.pdf', 'bytes');
        $this->post('/api/transactions/import/preview', ['file' => $file], $this->headers)->assertStatus(422);
    }

    public function test_unreadable_pdf_logs_only_the_exception_class(): void
    {
        Log::shouldReceive('warning')->once()->withArgs(
            fn ($msg, $ctx) => $msg === 'PDF unreadable' && isset($ctx['exception']) && count($ctx) === 1
        );
        $path = tempnam(sys_get_temp_dir(), 'pdf');
        file_put_contents($path, 'not a pdf');

        try {
            (new SmalotPdfTextExtractor)->extract($path);
            $this->fail('expected StatementParseException');
        } catch (StatementParseException $e) {
            $this->assertSame('unreadable_pdf', $e->getMessage());
        } finally {
            unlink($path);
        }
    }

    public function test_busy_suggestion_lock_is_logged(): void
    {
        config(['ai.statement.lock_wait' => 0]);
        $lock = Cache::lock('statement-ai:'.$this->admin->id, 30);
        $lock->get();
        Log::shouldReceive('info')->once()->withArgs(fn ($msg, $ctx) => $msg === 'Statement AI busy' && $ctx['user_id'] === $this->admin->id);

        $this->postJson('/api/transactions/import/suggest', ['rows' => [['description' => 'x', 'type' => 'expense']]], $this->headers)
            ->assertOk()->assertJsonPath('busy', true);
        $lock->release();
    }

    public function test_import_result_is_logged_with_counts_only(): void
    {
        $cat = Category::firstOrCreate(['name' => 'Food', 'type' => 'expense']);
        Log::shouldReceive('info')->once()->withArgs(
            fn ($msg, $ctx) => $msg === 'Statement imported' && $ctx['imported'] === 1 && $ctx['user_id'] === $this->admin->id
                && ! str_contains(json_encode($ctx), 'PRIVATE-DESC')
        );

        $this->postJson('/api/transactions/import', ['rows' => [
            ['date' => '2026-03-04', 'description' => 'PRIVATE-DESC', 'amount' => 5, 'type' => 'expense', 'category_id' => $cat->id],
        ]], $this->headers)->assertStatus(201);
    }
}
