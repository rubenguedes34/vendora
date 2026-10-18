<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** A light log of imported bank statements: no PDF, no balances, no account data, only a fingerprint. */
    public function up(): void
    {
        Schema::create('statement_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->char('file_hash', 64);
            $table->date('period_from');
            $table->date('period_to');
            $table->unsignedInteger('rows_imported');
            $table->timestamps();

            $table->index(['user_id', 'file_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('statement_imports');
    }
};
