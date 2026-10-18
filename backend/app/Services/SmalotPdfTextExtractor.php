<?php

namespace App\Services;

use App\Exceptions\StatementParseException;
use Smalot\PdfParser\Parser;
use Throwable;

class SmalotPdfTextExtractor implements PdfTextExtractor
{
    public function extract(string $path): string
    {
        try {
            return (new Parser)->parseFile($path)->getText();
        } catch (Throwable) {
            // The library's message can quote file content, so it is never propagated.
            throw new StatementParseException('unreadable_pdf');
        }
    }
}
