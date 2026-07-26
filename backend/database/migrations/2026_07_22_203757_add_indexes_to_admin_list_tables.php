<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('budgets', function (Blueprint $table) {
            $table->index('user_id', 'budgets_user_id_index');
            $table->index('category_id', 'budgets_category_id_index');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->index('user_id', 'transactions_user_id_index');
            $table->index('category_id', 'transactions_category_id_index');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->index('user_id', 'categories_user_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('budgets', function (Blueprint $table) {
            $table->dropIndex('budgets_user_id_index');
            $table->dropIndex('budgets_category_id_index');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_user_id_index');
            $table->dropIndex('transactions_category_id_index');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('categories_user_id_index');
        });
    }
};
