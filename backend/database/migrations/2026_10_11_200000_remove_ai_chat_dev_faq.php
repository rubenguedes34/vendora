<?php

use App\Models\Faq;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Faq::where('question', 'What should I do if the AI chat does not answer?')->delete();
    }

    public function down(): void
    {
        //
    }
};
