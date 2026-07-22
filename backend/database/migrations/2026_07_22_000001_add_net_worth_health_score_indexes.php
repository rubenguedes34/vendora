<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->index(['user_id', 'type', 'transaction_date'], 'idx_user_type_date');
        });

        Schema::table('investments', function (Blueprint $table) {
            $table->index(['user_id', 'purchase_date'], 'idx_user_purchase_date');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('idx_user_type_date');
        });

        Schema::table('investments', function (Blueprint $table) {
            $table->dropIndex('idx_user_purchase_date');
        });
    }
};
