<?php

namespace Tests\Feature;

use App\Services\LogReader;
use Tests\TestCase;

class LogReaderTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = sys_get_temp_dir().'/logreader-'.uniqid();
        mkdir($this->dir);
        config(['logging.reader_path' => $this->dir]);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir.'/*'));
        rmdir($this->dir);
        parent::tearDown();
    }

    public function test_files_lists_only_log_files(): void
    {
        file_put_contents($this->dir.'/a.log', 'x');
        file_put_contents($this->dir.'/b.txt', 'x');

        $this->assertSame(['a.log'], (new LogReader)->files());
    }

    public function test_tail_rejects_path_traversal(): void
    {
        file_put_contents($this->dir.'/a.log', "line\n");
        file_put_contents(dirname($this->dir).'/x.log', "secret\n");

        $this->assertSame([], (new LogReader)->tail('../x.log'));
        $this->assertSame([], (new LogReader)->tail('..%2F.env'));

        unlink(dirname($this->dir).'/x.log');
    }

    public function test_tail_filters_level_and_search(): void
    {
        file_put_contents($this->dir.'/a.log', "[t] local.ERROR: boom\n[t] local.INFO: ok\n");
        $reader = new LogReader;

        $this->assertSame(['[t] local.ERROR: boom'], $reader->tail('a.log', level: 'error'));
        $this->assertSame(['[t] local.INFO: ok'], $reader->tail('a.log', search: 'OK'));
    }

    public function test_tail_reads_only_end_of_big_file(): void
    {
        file_put_contents($this->dir.'/a.log', str_repeat("filler line of padding text\n", 110000)."last line\n");

        $lines = (new LogReader)->tail('a.log', 50);

        $this->assertCount(50, $lines);
        $this->assertSame('last line', end($lines));
    }

    public function test_files_can_be_limited_to_one_area(): void
    {
        foreach (['auth-2026-10-22.log', 'ai-2026-10-22.log', 'laravel.log', 'laravel-2026-10-21.log'] as $name) {
            file_put_contents($this->dir.'/'.$name, 'x');
        }
        $reader = new LogReader;

        $this->assertSame(['auth-2026-10-22.log'], $reader->files('auth'));
        $this->assertSame(['ai-2026-10-22.log'], $reader->files('ai'));
        $this->assertEqualsCanonicalizing(['laravel.log', 'laravel-2026-10-21.log'], $reader->files('app'));
        $this->assertSame([], $reader->files('market'));
    }

    public function test_tail_filters_by_context_fields_with_exact_values(): void
    {
        file_put_contents($this->dir.'/a.log', implode("\n", [
            '[t] local.WARNING: one {"user_id":5,"ip":"1.2.3.4"} []',
            '[t] local.WARNING: two {"user_id":55,"ip":"1.2.3.40"} []',
            '[t] local.WARNING: three {"user_id":5,"status":502} []',
        ])."\n");
        $reader = new LogReader;

        $this->assertCount(2, $reader->tail('a.log', context: ['user_id' => '5']));
        $this->assertCount(1, $reader->tail('a.log', context: ['ip' => '1.2.3.4']));
        $this->assertCount(1, $reader->tail('a.log', context: ['user_id' => '5', 'status' => '502']));
        $this->assertSame([], $reader->tail('a.log', context: ['user_id' => '9']));
    }
}
