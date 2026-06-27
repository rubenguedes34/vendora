<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\BudgetRange;

class BudgetRangeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Predefined budget ranges for user selection
        $budgetRanges = [
            [
                'name' => 'Starter',
                'min_amount' => 0,
                'max_amount' => 500,
                'description' => 'Basic budget for essential expenses',
            ],
            [
                'name' => 'Budget',
                'min_amount' => 500,
                'max_amount' => 1000,
                'description' => 'Moderate budget for everyday expenses',
            ],
            [
                'name' => 'Standard',
                'min_amount' => 1000,
                'max_amount' => 2000,
                'description' => 'Standard budget for regular expenses',
            ],
            [
                'name' => 'Comfortable',
                'min_amount' => 2000,
                'max_amount' => 3500,
                'description' => 'Comfortable budget with some flexibility',
            ],
            [
                'name' => 'Premium',
                'min_amount' => 3500,
                'max_amount' => 5000,
                'description' => 'Premium budget for higher expenses',
            ],
            [
                'name' => 'Luxury',
                'min_amount' => 5000,
                'max_amount' => 10000,
                'description' => 'Luxury budget for high-end expenses',
            ],
            [
                'name' => 'Unlimited',
                'min_amount' => 10000,
                'max_amount' => 999999.99,
                'description' => 'No budget restrictions',
            ],
        ];

        foreach ($budgetRanges as $range) {
            BudgetRange::firstOrCreate(
                ['name' => $range['name']],
                [
                    'min_amount' => $range['min_amount'],
                    'max_amount' => $range['max_amount'],
                    'description' => $range['description'],
                ]
            );
        }
    }
}
