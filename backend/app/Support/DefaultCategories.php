<?php

namespace App\Support;

use App\Models\Category;

/**
 * Single source of truth for the shared category catalog.
 */
class DefaultCategories
{
    public const LIST = [
        ['name' => 'Salary',          'type' => 'income',  'icon' => '💰', 'color' => '#10B981'],
        ['name' => 'Freelance',       'type' => 'income',  'icon' => '💼', 'color' => '#3B82F6'],
        ['name' => 'Side Income',     'type' => 'income',  'icon' => '📈', 'color' => '#F59E0B'],
        ['name' => 'Investments',     'type' => 'income',  'icon' => '📈', 'color' => '#F59E0B'],
        ['name' => 'Other Income',    'type' => 'income',  'icon' => '💵', 'color' => '#94A3B8'],
        ['name' => 'Food',            'type' => 'expense', 'icon' => '🍔', 'color' => '#EF4444'],
        ['name' => 'Transport',       'type' => 'expense', 'icon' => '🚗', 'color' => '#3B82F6'],
        ['name' => 'Rent',            'type' => 'expense', 'icon' => '🏠', 'color' => '#8B5CF6'],
        ['name' => 'Entertainment',   'type' => 'expense', 'icon' => '🎬', 'color' => '#EC4899'],
        ['name' => 'Shopping',        'type' => 'expense', 'icon' => '🛍️', 'color' => '#F59E0B'],
        ['name' => 'Bills',           'type' => 'expense', 'icon' => '📄', 'color' => '#6366F1'],
        ['name' => 'Health',          'type' => 'expense', 'icon' => '🏥', 'color' => '#14B8A6'],
        ['name' => 'Education',       'type' => 'expense', 'icon' => '📚', 'color' => '#6366F1'],
        ['name' => 'Other Expenses',  'type' => 'expense', 'icon' => '📦', 'color' => '#94A3B8'],
        ['name' => 'Emergency Fund',  'type' => 'savings', 'icon' => '🛡️', 'color' => '#10B981'],
        ['name' => 'Vacation',        'type' => 'savings', 'icon' => '✈️', 'color' => '#3B82F6'],
        ['name' => 'General Savings', 'type' => 'savings', 'icon' => '🏦', 'color' => '#8B5CF6'],
    ];

    /**
     * Create any missing default categories, leaving existing rows untouched.
     *
     * @return array<string, Category> categories keyed by name
     */
    public static function ensure(): array
    {
        $categories = [];

        foreach (self::LIST as $category) {
            $categories[$category['name']] = Category::firstOrCreate(
                ['name' => $category['name'], 'type' => $category['type']],
                ['icon' => $category['icon'], 'color' => $category['color']]
            );
        }

        return $categories;
    }
}
