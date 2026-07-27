<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question');
            $table->text('answer');
            $table->json('keywords');
            $table->timestamps();
        });

        DB::table('faqs')->insert([
            [
                'question' => 'How do I add a new transaction?',
                'answer' => 'Go to Transactions, click the + button, choose a category, enter the amount and date, and save. Income is recorded as a positive amount; expenses are recorded as negative. You can also add notes and a receipt.',
                'keywords' => json_encode(['transaction', 'add', 'expense', 'income', 'new', 'spend']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'How do budgets work?',
                'answer' => 'Budgets let you set monthly spending limits per category. Open Budgets, create a budget for a category and month, and Vendora will compare your actual spending against the limit.',
                'keywords' => json_encode(['budget', 'monthly', 'limit', 'category', 'spending']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'How do I track my investments?',
                'answer' => 'Use the Investments page to add holdings manually. You can record the symbol, quantity, initial amount, and current value. The Market > Quote page helps you look up live prices.',
                'keywords' => json_encode(['investment', 'invest', 'stock', 'holding', 'portfolio']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'What are recurring transactions?',
                'answer' => 'Recurring transactions are regular income or expenses that repeat, like subscriptions or salary. You can schedule them and copy them into a new month to generate the actual transaction when it occurs.',
                'keywords' => json_encode(['recurring', 'recurrent', 'repeat', 'monthly', 'subscription']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'How can I see my net worth and financial health?',
                'answer' => 'The Dashboard shows your balance, monthly income and expenses, and net worth. The Financial Records section provides historical trends, allocation breakdowns, and a health score.',
                'keywords' => json_encode(['dashboard', 'net worth', 'health', 'balance', 'income', 'expense', 'report']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'How do I export my transactions?',
                'answer' => 'On the Transactions page, use the Export option to download your records. You can filter by date, category, or amount before exporting.',
                'keywords' => json_encode(['export', 'download', 'transactions', 'csv', 'pdf']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Can I connect my bank or sync investments automatically?',
                'answer' => 'Bank connections and automatic sync are not supported yet. Investments and market prices are tracked manually through the Market > Quote page.',
                'keywords' => json_encode(['bank', 'connect', 'sync', 'automatic', 'market', 'quote']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'How do I access the admin panel?',
                'answer' => 'Click “Admin” in the left sidebar. Only users with the admin or manager role can access it. Admins can manage users, view metrics, and assign roles.',
                'keywords' => json_encode(['admin', 'manager', 'panel', 'access', 'role']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'Who can see my data?',
                'answer' => 'Your personal transactions, budgets, and investments are visible only to you. Admins can manage accounts and roles, but they cannot read individual transaction details.',
                'keywords' => json_encode(['privacy', 'data', 'see', 'who', 'visible']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'question' => 'What should I do if the AI chat does not answer?',
                'answer' => 'Make sure the Laravel backend is running on localhost:8000. The AI support works without an OpenAI key by matching your question to these FAQs. For full AI-generated answers, add an OPENAI_API_KEY to backend/.env.',
                'keywords' => json_encode(['ai', 'chat', 'not working', 'openai', 'answer', 'backend']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('faqs');
    }
};
