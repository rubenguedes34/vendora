<?php

namespace App\Ai\Agents;

use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Promptable;

class StatementCategoryAgent implements Agent
{
    use Promptable;

    public function __construct(private string $systemPrompt) {}

    public function instructions(): string
    {
        return $this->systemPrompt;
    }
}
