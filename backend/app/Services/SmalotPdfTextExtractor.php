<?php

namespace App\Services;

use App\Exceptions\StatementParseException;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;
use Throwable;

class SmalotPdfTextExtractor implements PdfTextExtractor
{
    public function extract(string $path): string
    {
        try {
            return (new Parser)->parseFile($path)->getText();
        } catch (Throwable $e) {
            // The library's message can quote file content, so it is never propagated or logged.
            Log::channel('import')->warning('PDF unreadable', ['exception' => $e::class]);

            throw new StatementParseException('unreadable_pdf');
        }
    }
}
