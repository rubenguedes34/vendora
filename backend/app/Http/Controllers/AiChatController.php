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
                'question' => 'How do I add a transaction?',
                'answer' => 'Go to Transactions, click +, select a category, enter the amount and date, then save.',
                'keywords' => ['transaction', 'add', 'expense', 'income'],
            ],
            [
                'question' => 'How do I set a monthly budget?',
                'answer' => 'Open Budgets, create a new budget, pick a category and the month, then set the amount.',
                'keywords' => ['budget', 'monthly', 'set'],
            ],
            [
                'question' => 'Can I connect my bank or investments?',
                'answer' => 'Currently investments are tracked manually. Market data lookup is available under Market > Quote.',
                'keywords' => ['bank', 'connect', 'investment', 'market', 'quote'],
            ],
            [
                'question' => 'How do I access the admin panel?',
                'answer' => 'Click “Admin” in the left sidebar. You need an admin or manager role to open it.',
                'keywords' => ['admin', 'manager', 'panel', 'access'],
            ],
            [
                'question' => 'Who can see my data?',
                'answer' => 'Your data is tied to your account. Admins can manage users but cannot read personal transaction details.',
                'keywords' => ['data', 'privacy', 'see', 'who'],
            ],
        ];
    }

    private function localResponse(string $message): string
    {
        $lowercase = strtolower($message);
        $tokens = preg_split('/[^\w]+/', $lowercase, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        $best = null;
        $bestScore = 0;

        foreach ($this->faqList() as $faq) {
            $score = count(array_intersect($tokens, $faq['keywords']));
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $faq;
            }
        }

        if ($best !== null) {
            return $best['answer'] . "\n\n(Live AI is not configured right now, so I used the closest FAQ match.)";
        }

        return "I'm a local support assistant. I don't have a live AI provider configured at the moment. Try asking one of the FAQ questions, or set OPENAI_API_KEY in the backend .env file for full AI responses.";
    }
}
