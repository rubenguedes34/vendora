<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** The bank's own text for an imported movement, kept so renaming it later does not break duplicate checks. */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('source_description')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('source_description');
        });
    }
};
