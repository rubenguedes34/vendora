<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->index('transaction_date');
            $table->index(['user_id', 'transaction_date']);
            $table->index(['user_id', 'category_id']);
        });

        Schema::table('budgets', function (Blueprint $table) {
            $table->index(['user_id', 'month']);
        });

        Schema::table('investments', function (Blueprint $table) {
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['transaction_date']);
            $table->dropIndex(['user_id', 'transaction_date']);
            $table->dropIndex(['user_id', 'category_id']);
        });

        Schema::table('budgets', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'month']);
        });

        Schema::table('investments', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
        });
    }
};
