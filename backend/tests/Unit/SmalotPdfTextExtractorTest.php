<?php

namespace Tests\Unit;

use App\Exceptions\StatementParseException;
use App\Services\SmalotPdfTextExtractor;
use Barryvdh\DomPDF\Facade\Pdf;
use Tests\TestCase;

class SmalotPdfTextExtractorTest extends TestCase
{
    private function tempFile(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'pdf');
        file_put_contents($path, $contents);

        return $path;
    }

    public function test_extracts_text_from_a_pdf(): void
    {
        $pdf = Pdf::loadHTML('<p>SALDO INICIAL 105.70</p>')->output();
        $path = $this->tempFile($pdf);

        $this->assertStringContainsString('SALDO INICIAL', (new SmalotPdfTextExtractor)->extract($path));

        unlink($path);
    }

    public function test_a_file_that_is_not_a_pdf_throws_a_generic_exception(): void
    {
        $path = $this->tempFile('this is secret statement text, not a pdf');

        try {
            (new SmalotPdfTextExtractor)->extract($path);
            $this->fail('Expected StatementParseException');
        } catch (StatementParseException $e) {
            $this->assertSame('unreadable_pdf', $e->getMessage());
            $this->assertStringNotContainsString('secret', $e->getMessage());
        } finally {
            unlink($path);
        }
    }
}
