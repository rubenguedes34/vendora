<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->string('ticker_symbol')->nullable()->after('type');
            $table->decimal('units', 18, 8)->nullable()->after('current_amount');
            $table->decimal('price_per_unit', 18, 8)->nullable()->after('units');
        });
    }

    public function down(): void
    {
        Schema::table('investments', function (Blueprint $table) {
            $table->dropColumn(['ticker_symbol', 'units', 'price_per_unit']);
        });
    }
};
