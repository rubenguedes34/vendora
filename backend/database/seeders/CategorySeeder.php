<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get admin user (or first user) to assign default categories
        $user = \App\Models\User::first();
        
        if (!$user) {
            $this->command->warn('No users found. Please create a user first.');
            return;
        }

        // Default expense categories
        $defaultCategories = [
            [
                'name' => 'Food',
                'icon' => '🍔',
                'color' => '#EF4444',
                'type' => 'expense',
            ],
            [
                'name' => 'Transport',
                'icon' => '🚗',
                'color' => '#3B82F6',
                'type' => 'expense',
            ],
            [
                'name' => 'Entertainment',
                'icon' => '🎬',
                'color' => '#8B5CF6',
                'type' => 'expense',
            ],
            [
                'name' => 'Shopping',
                'icon' => '🛍️',
                'color' => '#F59E0B',
                'type' => 'expense',
            ],
            [
                'name' => 'Bills',
                'icon' => '📄',
                'color' => '#10B981',
                'type' => 'expense',
            ],
            [
                'name' => 'Health',
                'icon' => '🏥',
                'color' => '#EC4899',
                'type' => 'expense',
            ],
            [
                'name' => 'Education',
                'icon' => '📚',
                'color' => '#6366F1',
                'type' => 'expense',
            ],
            [
                'name' => 'Salary',
                'icon' => '💰',
                'color' => '#10B981',
                'type' => 'income',
            ],
            [
                'name' => 'Freelance',
                'icon' => '💼',
                'color' => '#3B82F6',
                'type' => 'income',
            ],
            [
                'name' => 'Investments',
                'icon' => '📈',
                'color' => '#F59E0B',
                'type' => 'income',
            ],
            [
                'name' => 'Emergency Fund',
                'icon' => '🛡️',
                'color' => '#10B981',
                'type' => 'savings',
            ],
            [
                'name' => 'Vacation',
                'icon' => '✈️',
                'color' => '#3B82F6',
                'type' => 'savings',
            ],
            [
                'name' => 'General Savings',
                'icon' => '🏦',
                'color' => '#8B5CF6',
                'type' => 'savings',
            ],
        ];

        foreach ($defaultCategories as $category) {
            Category::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'name' => $category['name'],
                    'type' => $category['type']
                ],
                [
                    'icon' => $category['icon'],
                    'color' => $category['color'],
                ]
            );
        }
    }
}
