<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->recreateCategoriesTable();
        } else {
            DB::statement("ALTER TABLE categories MODIFY COLUMN type ENUM('income', 'expense', 'savings') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->recreateCategoriesTable();
        } else {
            DB::statement("ALTER TABLE categories MODIFY COLUMN type ENUM('income', 'expense') NOT NULL");
        }
    }

    private function recreateCategoriesTable(): void
    {
        DB::statement('PRAGMA foreign_keys = OFF');

        Schema::create('categories_new', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('icon')->nullable();
            $table->string('color')->nullable();
            $table->string('type');
            $table->timestamps();
        });

        DB::statement('INSERT INTO categories_new SELECT id, user_id, name, icon, color, type, created_at, updated_at FROM categories');

        Schema::drop('categories');
        Schema::rename('categories_new', 'categories');

        DB::statement('PRAGMA foreign_keys = ON');
    }
};
