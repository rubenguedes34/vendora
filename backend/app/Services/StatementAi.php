<?php

namespace App\Services;

interface StatementAi
{
    /** The model's raw text reply, or null when no local model is available or it failed. */
    public function complete(string $instructions, string $prompt): ?string;
}
