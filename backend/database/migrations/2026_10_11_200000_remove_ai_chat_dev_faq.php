<?php

use App\Models\Faq;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Faq::where('question', 'What should I do if the AI chat does not answer?')->delete();
    }

    public function down(): void
    {
        $question = 'What should I do if the AI chat does not answer?';

        // faqs.question has no unique index, so guard against a duplicate on repeated rollbacks.
        if (DB::table('faqs')->where('question', $question)->exists()) {
            return;
        }

        DB::table('faqs')->insert([
            'question' => $question,
            'answer' => 'Make sure the Laravel backend is running on localhost:8000. The AI support works without an OpenAI key by matching your question to these FAQs. For full AI-generated answers, add an OPENAI_API_KEY to backend/.env.',
            'keywords' => json_encode(['ai', 'chat', 'not working', 'openai', 'answer', 'backend']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
};
