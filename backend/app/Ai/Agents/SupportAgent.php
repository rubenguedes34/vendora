<?php

namespace App\Ai\Agents;

use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Promptable;

class SupportAgent implements Agent, Conversational
{
    use Promptable, RemembersConversations;

    /**
     * @param  array<int, array{question: string, answer: string}>  $faqs  FAQs relevant to the question; kept short because prompt size drives latency on CPU-only models.
     */
    public function __construct(private array $faqs = []) {}

    // Few messages of context: prompt size drives latency on CPU-only models.
    protected function maxConversationMessages(): int
    {
        return 6;
    }

    public function instructions(): string
    {
        $faqs = collect($this->faqs)
            ->map(fn (array $faq) => "Q: {$faq['question']}\nA: {$faq['answer']}")
            ->implode("\n\n") ?: '(no matching FAQ)';

        return <<<PROMPT
You are the friendly and concise AI support assistant for Vendora, a personal finance
management application. You help users with questions about budgeting, transactions,
investments, categories, recurring payments, the admin panel, and account settings.

Use the language the user writes in. If you do not know the answer or the question
is unrelated to Vendora, say so clearly and suggest contacting support.
Only describe features that appear in the reference below; never invent features.

Reference FAQs:
{$faqs}
PROMPT;
    }
}
