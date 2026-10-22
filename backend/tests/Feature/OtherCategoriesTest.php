<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Support\DefaultCategories;
use Database\Seeders\CategorySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OtherCategoriesTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_category_seeder_adds_the_catch_alls_to_an_existing_catalog(): void
    {
        Category::create(['name' => 'Food', 'type' => 'expense']); // an older database

        $this->seed(CategorySeeder::class);

        $this->assertTrue(Category::where(['name' => 'Other Income', 'type' => 'income'])->exists());
        $this->assertTrue(Category::where(['name' => 'Other Expenses', 'type' => 'expense'])->exists());
    }

    public function test_ensure_is_idempotent_and_includes_them(): void
    {
        DefaultCategories::ensure();
        DefaultCategories::ensure();

        $this->assertSame(1, Category::where('name', 'Other Income')->count());
        $this->assertSame(1, Category::where('name', 'Other Expenses')->count());
    }
}
