<?php

use App\Models\Category;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Category::updateOrCreate(
            ['name' => 'Car', 'type' => 'expense'],
            ['icon' => '🚗', 'color' => '#3B82F6']
        );

        Category::updateOrCreate(
            ['name' => 'GBR', 'type' => 'expense'],
            ['icon' => '🚀', 'color' => '#F97316']
        );
    }

    public function down(): void
    {
        Category::whereIn('name', ['Car', 'GBR'])
            ->where('type', 'expense')
            ->delete();
    }
};
