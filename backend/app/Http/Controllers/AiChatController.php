<?php

namespace App\Http\Controllers;

use App\Ai\Agents\SupportAgent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Enums\Lab;
use App\Models\Faq;
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
        return Faq::all()->map(fn (Faq $faq) => [
            'question' => $faq->question,
            'answer' => $faq->answer,
            'keywords' => $faq->keywords,
        ])->all();
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
