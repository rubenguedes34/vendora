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

        if (empty(config('ai.providers.openai.key'))) {
            return response()->json([
                'message' => 'AI support is not configured. Please set OPENAI_API_KEY in your .env file.',
            ], 503);
        }

        try {
            $response = SupportAgent::make()->prompt(
                $request->input('message'),
                provider: Lab::OpenAI,
            );

            return response()->json([
                'message' => (string) $response,
            ]);
        } catch (Throwable $e) {
            Log::error('AI chat failed', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Sorry, the AI support service is unavailable right now. Please try again later.',
            ], 500);
        }
    }

    public function faqs(): JsonResponse
    {
        return response()->json([
            'data' => [
                [
                    'question' => 'How do I add a transaction?',
                    'answer' => 'Go to Transactions, click +, select a category, enter the amount and date, then save.',
                ],
                [
                    'question' => 'How do I set a monthly budget?',
                    'answer' => 'Open Budgets, create a new budget, pick a category and the month, then set the amount.',
                ],
                [
                    'question' => 'Can I connect my bank or investments?',
                    'answer' => 'Currently investments are tracked manually. Market data lookup is available under Market > Quote.',
                ],
                [
                    'question' => 'How do I access the admin panel?',
                    'answer' => 'Click “Admin” in the left sidebar. You need an admin or manager role to open it.',
                ],
                [
                    'question' => 'Who can see my data?',
                    'answer' => 'Your data is tied to your account. Admins can manage users but cannot read personal transaction details.',
                ],
            ],
        ]);
    }
}
