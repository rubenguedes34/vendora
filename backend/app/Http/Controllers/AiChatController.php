<?php

namespace App\Http\Controllers;

use App\Ai\Agents\SupportAgent;
use App\Http\Requests\Ai\ChatRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Contracts\ConversationStore;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Models\Conversation;
use App\Models\Faq;
use Throwable;

class AiChatController extends Controller
{
    public function chat(ChatRequest $request): JsonResponse
    {
        $message = $request->input('message');

        $provider = $this->supportProvider();

        if ($provider === null) {
            return response()->json([
                'message' => $this->localResponse($message),
            ]);
        }

        $user = $request->user();
        $conversationId = $request->input('conversation_id');

        if ($conversationId !== null && ! $this->userConversations($user)->whereKey($conversationId)->exists()) {
            return response()->json(['message' => 'Conversation not found.'], 404);
        }

        $models = config('ai.support.models') ?: [null];
        $timeout = (int) config('ai.support.timeout');

        // A local model can outlast PHP's default 30 s request limit (cold start loads it into RAM).
        set_time_limit($timeout * count($models) + 15);

        foreach ($models as $model) {
            try {
                $agent = new SupportAgent($this->relevantFaqs($message, 3));
                $agent = $conversationId !== null
                    ? $agent->continue($conversationId, $user)
                    : $agent->forUser($user);

                $response = $agent->prompt(
                        $message,
                        provider: $provider,
                        model: $model,
                        timeout: $timeout,
                    );

                return response()->json([
                    'message' => (string) $response,
                    'conversation_id' => $response->conversationId ?? $conversationId,
                ]);
            } catch (Throwable $e) {
                Log::warning('AI chat model failed', ['model' => $model, 'error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'message' => $this->localResponse($message),
        ]);
    }

    private function supportProvider(): ?Lab
    {
        $name = config('ai.support.provider')
            ?: (config('ai.providers.openai.key') ? 'openai' : 'none');

        return match ($name) {
            'ollama' => Lab::Ollama,
            'openai' => Lab::OpenAI,
            default => null,
        };
    }

    public function conversations(Request $request): JsonResponse
    {
        $data = $this->userConversations($request->user())
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get(['id', 'title', 'updated_at']);

        return response()->json(['data' => $data]);
    }

    public function conversation(Request $request, string $id): JsonResponse
    {
        $this->userConversations($request->user())->findOrFail($id);

        $messages = resolve(ConversationStore::class)->getLatestConversationMessages($id, 100)
            ->filter(fn ($m) => in_array($m->role->value, ['user', 'assistant'], true) && filled($m->content))
            ->map(fn ($m) => ['role' => $m->role->value, 'text' => $m->content]);

        return response()->json(['data' => $messages->values()]);
    }

    public function deleteConversation(Request $request, string $id): JsonResponse
    {
        $conversation = $this->userConversations($request->user())->findOrFail($id);

        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json(['message' => 'Conversation deleted.']);
    }

    private function userConversations(object $user)
    {
        return Conversation::where('participant_type', Conversation::participantType($user))
            ->where('participant_id', Conversation::participantKey($user));
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

        $best = $this->relevantFaqs($message, 1)[0] ?? null;

        if ($best !== null) {
            return $best['answer'];
        }

        return "I'm not sure about that. Here are some things I can help with:\n" . $this->faqSuggestions();
    }

    /**
     * FAQs that match the message by keyword, best first.
     */
    private function relevantFaqs(string $message, int $limit): array
    {
        $lowercase = strtolower($message);
        $scored = [];

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

            if ($score > 0) {
                $scored[] = ['score' => $score, 'faq' => $faq];
            }
        }

        usort($scored, fn (array $a, array $b) => $b['score'] <=> $a['score']);

        return array_slice(array_column($scored, 'faq'), 0, $limit);
    }

    private function faqSuggestions(): string
    {
        return collect($this->faqList())
            ->map(fn (array $faq) => '• ' . $faq['question'])
            ->implode("\n");
    }
}
