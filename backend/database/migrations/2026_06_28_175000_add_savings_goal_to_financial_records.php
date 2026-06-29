<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_records', function (Blueprint $table) {
            $table->decimal('savings_goal', 10, 2)->default(0)->after('monthly_expenses');
            $table->enum('savings_goal_type', ['percentage', 'fixed'])->default('fixed')->after('savings_goal');
        });
    }

    public function down(): void
    {
        Schema::table('financial_records', function (Blueprint $table) {
            $table->dropColumn(['savings_goal', 'savings_goal_type']);
        });
    }
};
