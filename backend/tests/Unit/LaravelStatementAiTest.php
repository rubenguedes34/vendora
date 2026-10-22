<?php

namespace Tests\Unit;

use App\Services\LaravelStatementAi;
use Tests\TestCase;

class LaravelStatementAiTest extends TestCase
{
    public function test_it_only_runs_on_the_local_ollama_provider_never_the_cloud(): void
    {
        foreach ([null, '', 'none', 'openai'] as $provider) {
            config(['ai.support.provider' => $provider, 'ai.support.models' => ['llama3.2:3b']]);

            $this->assertNull((new LaravelStatementAi)->complete('system', 'prompt'), "provider {$provider} must not be used");
        }
    }

    public function test_it_is_unavailable_without_a_configured_model(): void
    {
        config(['ai.support.provider' => 'ollama', 'ai.support.models' => []]);

        $this->assertNull((new LaravelStatementAi)->complete('system', 'prompt'));
    }

    public function test_statement_specific_models_replace_the_support_models(): void
    {
        config(['ai.support.provider' => 'ollama', 'ai.support.models' => ['llama3.2:3b', 'llama3.2:1b'], 'ai.statement.models' => []]);
        $this->assertSame(['llama3.2:3b', 'llama3.2:1b'], (new LaravelStatementAi)->models());

        config(['ai.statement.models' => ['llama3.2:3b']]);
        $this->assertSame(['llama3.2:3b'], (new LaravelStatementAi)->models());
    }

    public function test_it_refuses_a_hosted_ollama_or_a_cloud_model(): void
    {
        config(['ai.support.provider' => 'ollama', 'ai.support.models' => ['llama3.2:3b'], 'ai.statement.models' => []]);

        config(['ai.providers.ollama.key' => 'secret-key']); // a hosted Ollama needs a key
        $this->assertNull((new LaravelStatementAi)->complete('s', 'p'));

        config(['ai.providers.ollama.key' => null, 'ai.statement.models' => ['gpt-oss:120b-cloud']]); // offloaded to the cloud
        $this->assertNull((new LaravelStatementAi)->complete('s', 'p'));
    }
}
