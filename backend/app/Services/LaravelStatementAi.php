<?php

namespace App\Services;

use App\Ai\Agents\StatementCategoryAgent;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Enums\Lab;
use Throwable;

/**
 * Runs the statement helper on the configured local Ollama only (no cloud provider, no API key, no "-cloud" model).
 * Statement descriptions can name people, so they are never sent to a hosted service, whatever AI_SUPPORT_PROVIDER says.
 * Pointing OLLAMA_URL at a remote machine you do not control is still your decision.
 */
class LaravelStatementAi implements StatementAi
{
    /** @return array<int, string> */
    public function models(): array
    {
        return array_slice(config('ai.statement.models') ?: config('ai.support.models') ?: [], 0, 3);
    }

    public function complete(string $instructions, string $prompt): ?string
    {
        if (config('ai.support.provider') !== 'ollama') {
            return null;
        }

        $models = $this->models();

        // A hosted Ollama needs an API key and "-cloud" models are offloaded to ollama.com: neither is local.
        if (config('ai.providers.ollama.key') || collect($models)->contains(fn ($m) => str_contains(strtolower($m), 'cloud'))) {
            return null;
        }

        $timeout = (int) (config('ai.statement.timeout') ?: config('ai.support.timeout'));
        set_time_limit($timeout * max(count($models), 1) + 15);

        foreach ($models as $model) {
            $started = microtime(true);
            try {
                $reply = (string) (new StatementCategoryAgent($instructions))
                    ->prompt($prompt, provider: Lab::Ollama, model: $model, timeout: $timeout);
                Log::info('Statement AI answered', ['model' => $model, 'seconds' => round(microtime(true) - $started, 1), 'reply_chars' => strlen($reply)]);

                return $reply;
            } catch (Throwable $e) {
                // Only the model name and timing: the exception text could quote the prompt.
                Log::warning('Statement AI model failed', ['model' => $model, 'seconds' => round(microtime(true) - $started, 1)]);
            }
        }

        return null;
    }
}
