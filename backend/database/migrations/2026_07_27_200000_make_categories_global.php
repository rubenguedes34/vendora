<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $canonicalCategoryIds = [];

        DB::table('categories')
            ->orderBy('id')
            ->get(['id', 'name', 'type'])
            ->each(function (object $category) use (&$canonicalCategoryIds): void {
                $key = $category->type . "\0" . $category->name;

                if (!isset($canonicalCategoryIds[$key])) {
                    $canonicalCategoryIds[$key] = $category->id;
                    return;
                }

                $canonicalId = $canonicalCategoryIds[$key];

                DB::table('transactions')->where('category_id', $category->id)->update(['category_id' => $canonicalId]);
                DB::table('budgets')->where('category_id', $category->id)->update(['category_id' => $canonicalId]);
                DB::table('recurrent_transactions')->where('category_id', $category->id)->update(['category_id' => $canonicalId]);
                DB::table('categories')->where('id', $category->id)->delete();
            });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropIndex('categories_user_id_index');
            $table->dropColumn('user_id');
            $table->unique(['name', 'type'], 'categories_name_type_unique');
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropUnique('categories_name_type_unique');
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->index('user_id', 'categories_user_id_index');
        });
    }
};
