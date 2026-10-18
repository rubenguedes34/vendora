<?php

namespace App\Services;

use App\Exceptions\StatementParseException;

interface PdfTextExtractor
{
    /** @throws StatementParseException unreadable_pdf */
    public function extract(string $path): string;
}
