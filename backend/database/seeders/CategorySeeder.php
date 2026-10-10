<?php

namespace Database\Seeders;

use App\Support\DefaultCategories;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        DefaultCategories::ensure();
    }
}
