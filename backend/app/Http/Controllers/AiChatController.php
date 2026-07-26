<?php

namespace App\Http\Controllers;

use App\Ai\Agents\SupportAgent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Enums\Lab;
use Throwable;

class AiChatController extends Controller
{
    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $message = $request->input('message');

        if (empty(config('ai.providers.openai.key'))) {
            return response()->json([
                'message' => $this->localResponse($message),
            ]);
        }

        try {
            $response = SupportAgent::make()->prompt(
                $message,
                provider: Lab::OpenAI,
            );

            return response()->json([
                'message' => (string) $response,
            ]);
        } catch (Throwable $e) {
            Log::error('AI chat failed', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => $this->localResponse($message),
            ]);
        }
    }

    public function faqs(): JsonResponse
    {
        return response()->json([
            'data' => $this->faqList(),
        ]);
    }

    private function faqList(): array
    {
        return [
            [
                'question' => 'How do I add a new transaction?',
                'answer' => 'Go to Transactions, click the + button, choose a category, enter the amount and date, and save. Income is recorded as a positive amount; expenses are recorded as negative. You can also add notes and a receipt.',
                'keywords' => ['transaction', 'add', 'expense', 'income', 'new', 'spend'],
            ],
            [
                'question' => 'How do budgets work?',
                'answer' => 'Budgets let you set monthly spending limits per category. Open Budgets, create a budget for a category and month, and Vendora will compare your actual spending against the limit.',
                'keywords' => ['budget', 'monthly', 'limit', 'category', 'spending'],
            ],
            [
                'question' => 'How do I track my investments?',
                'answer' => 'Use the Investments page to add holdings manually. You can record the symbol, quantity, initial amount, and current value. The Watchlist and Market > Quote pages help you look up live prices.',
                'keywords' => ['investment', 'invest', 'stock', 'holding', 'portfolio', 'watchlist'],
            ],
            [
                'question' => 'What are recurring transactions?',
                'answer' => 'Recurring transactions are regular income or expenses that repeat, like subscriptions or salary. You can schedule them and copy them into a new month to generate the actual transaction when it occurs.',
                'keywords' => ['recurring', 'recurrent', 'repeat', 'monthly', 'subscription'],
            ],
            [
                'question' => 'How can I see my net worth and financial health?',
                'answer' => 'The Dashboard shows your balance, monthly income and expenses, and net worth. The Financial Records section provides historical trends, allocation breakdowns, and a health score.',
                'keywords' => ['dashboard', 'net worth', 'health', 'balance', 'income', 'expense', 'report'],
            ],
            [
                'question' => 'How do I export my transactions?',
                'answer' => 'On the Transactions page, use the Export option to download your records. You can filter by date, category, or amount before exporting.',
                'keywords' => ['export', 'download', 'transactions', 'csv', 'pdf'],
            ],
            [
                'question' => 'Can I connect my bank or sync investments automatically?',
                'answer' => 'Bank connections and automatic sync are not supported yet. Investments and market prices are tracked manually through the Market > Quote page.',
                'keywords' => ['bank', 'connect', 'sync', 'automatic', 'market', 'quote'],
            ],
            [
                'question' => 'How do I access the admin panel?',
                'answer' => 'Click “Admin” in the left sidebar. Only users with the admin or manager role can access it. Admins can manage users, view metrics, and assign roles.',
                'keywords' => ['admin', 'manager', 'panel', 'access', 'role'],
            ],
            [
                'question' => 'Who can see my data?',
                'answer' => 'Your personal transactions, budgets, and investments are visible only to you. Admins can manage accounts and roles, but they cannot read individual transaction details.',
                'keywords' => ['privacy', 'data', 'see', 'who', 'visible'],
            ],
            [
                'question' => 'What should I do if the AI chat does not answer?',
                'answer' => 'Make sure the Laravel backend is running on localhost:8000. The AI support works without an OpenAI key by matching your question to these FAQs. For full AI-generated answers, add an OPENAI_API_KEY to backend/.env.',
                'keywords' => ['ai', 'chat', 'not working', 'openai', 'answer', 'backend'],
            ],
        ];
    }

    private function localResponse(string $message): string
    {
        $lowercase = strtolower($message);

        if (preg_match('/^\s*(hi+|hello|hey|howdy|greetings)\b/', $lowercase)) {
            return "Hi there! I can answer common questions about Vendora. Try asking:\n" . $this->faqSuggestions();
        }

        $best = null;
        $bestScore = 0;

        foreach ($this->faqList() as $faq) {
            $score = 0;
            foreach ($faq['keywords'] as $keyword) {
                if (str_contains($lowercase, $keyword)) {
                    $score++;
                }
            }

            if (preg_match('/[^\w](' . implode('|', array_map('preg_quote', $faq['keywords'])) . ')/', ' ' . $lowercase)) {
                $score++;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $faq;
            }
        }

        if ($best !== null && $bestScore >= 1) {
            return $best['answer'] . "\n\n(Live AI is not configured, so I matched this from the FAQ list.)";
        }

        return "I'm not sure about that. Here are some things I can help with:\n" . $this->faqSuggestions() . "\n\nSet OPENAI_API_KEY in the backend .env file for full AI answers.";
    }

    private function faqSuggestions(): string
    {
        return collect($this->faqList())
            ->map(fn (array $faq) => '• ' . $faq['question'])
            ->implode("\n");
    }
}
