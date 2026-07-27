<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Category;
use App\Models\FinancialRecord;
use App\Models\Transaction;
use App\Models\Budget;
use App\Models\RecurrentTransaction;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. Ensure admin user exists ──────────────────────────────────────
        $user = User::updateOrCreate(
            ['email' => 'admin@vendora.com'],
            [
                'name'             => 'Ruben Guedes',
                'password'         => Hash::make('Guedes13'),
                'monthly_income'   => 3500.00,
                'monthly_expenses' => 1800.00,
            ]
        );

        // ── 2. Categories ────────────────────────────────────────────────────
        $cats = [];
        $defs = [
            ['name' => 'Salary',         'type' => 'income',   'icon' => '💰', 'color' => '#10B981'],
            ['name' => 'Freelance',      'type' => 'income',   'icon' => '💼', 'color' => '#3B82F6'],
            ['name' => 'Side Income',    'type' => 'income',   'icon' => '📈', 'color' => '#F59E0B'],
            ['name' => 'Food',           'type' => 'expense',  'icon' => '🍔', 'color' => '#EF4444'],
            ['name' => 'Transport',      'type' => 'expense',  'icon' => '🚗', 'color' => '#3B82F6'],
            ['name' => 'Rent',           'type' => 'expense',  'icon' => '🏠', 'color' => '#8B5CF6'],
            ['name' => 'Entertainment',  'type' => 'expense',  'icon' => '🎬', 'color' => '#EC4899'],
            ['name' => 'Shopping',       'type' => 'expense',  'icon' => '🛍️', 'color' => '#F59E0B'],
            ['name' => 'Bills',          'type' => 'expense',  'icon' => '📄', 'color' => '#6366F1'],
            ['name' => 'Health',         'type' => 'expense',  'icon' => '🏥', 'color' => '#14B8A6'],
            ['name' => 'Emergency Fund', 'type' => 'savings',  'icon' => '🛡️', 'color' => '#10B981'],
            ['name' => 'Vacation',       'type' => 'savings',  'icon' => '✈️', 'color' => '#3B82F6'],
        ];

        foreach ($defs as $d) {
            $cats[$d['name']] = Category::firstOrCreate(
                ['name' => $d['name'], 'type' => $d['type']],
                ['icon' => $d['icon'], 'color' => $d['color']]
            );
        }

        // ── 3. Recurrent transactions ─────────────────────────────────────────
        $recurrents = [
            ['description' => 'Netflix',        'amount' => 15.99,   'type' => 'expense', 'category' => 'Entertainment', 'day' => 1],
            ['description' => 'Spotify',        'amount' => 9.99,    'type' => 'expense', 'category' => 'Entertainment', 'day' => 1],
            ['description' => 'Gym',            'amount' => 35.00,   'type' => 'expense', 'category' => 'Health',        'day' => 5],
            ['description' => 'Internet',       'amount' => 39.99,   'type' => 'expense', 'category' => 'Bills',         'day' => 10],
            ['description' => 'Phone Bill',     'amount' => 25.00,   'type' => 'expense', 'category' => 'Bills',         'day' => 15],
            ['description' => 'Rent',           'amount' => 700.00,  'type' => 'expense', 'category' => 'Rent',          'day' => 1],
            ['description' => 'Salary',         'amount' => 3500.00, 'type' => 'income',  'category' => 'Salary',        'day' => 25],
            ['description' => 'Emergency Fund', 'amount' => 200.00,  'type' => 'expense', 'category' => 'Emergency Fund','day' => 28],
        ];

        foreach ($recurrents as $r) {
            RecurrentTransaction::firstOrCreate(
                ['user_id' => $user->id, 'description' => $r['description']],
                [
                    'amount'       => $r['amount'],
                    'type'         => $r['type'],
                    'category_id'  => $cats[$r['category']]->id,
                    'day_of_month' => $r['day'],
                ]
            );
        }

        // ── 4. 12 months of financial records + transactions + budgets ────────
        $year = (int) date('Y');

        // Monthly income/expense variations to make charts interesting
        $monthlyData = [
            1  => ['income' => 3500,  'expenses' => 1950, 'note' => 'Jan - New year spending'],
            2  => ['income' => 3500,  'expenses' => 1650, 'note' => 'Feb - Low month'],
            3  => ['income' => 3800,  'expenses' => 1820, 'note' => 'Mar - Freelance bonus'],
            4  => ['income' => 3500,  'expenses' => 2100, 'note' => 'Apr - Easter trip'],
            5  => ['income' => 3500,  'expenses' => 1750, 'note' => 'May - Normal'],
            6  => ['income' => 4200,  'expenses' => 2300, 'note' => 'Jun - Side income + holiday'],
            7  => ['income' => 3500,  'expenses' => 2400, 'note' => 'Jul - Summer holiday'],
            8  => ['income' => 3500,  'expenses' => 2200, 'note' => 'Aug - Still summer'],
            9  => ['income' => 3900,  'expenses' => 1900, 'note' => 'Sep - Back to normal'],
            10 => ['income' => 3500,  'expenses' => 1800, 'note' => 'Oct - Normal'],
            11 => ['income' => 3500,  'expenses' => 2050, 'note' => 'Nov - Black Friday'],
            12 => ['income' => 4500,  'expenses' => 2800, 'note' => 'Dec - Christmas'],
        ];

        $currentMonth = (int) date('n');

        foreach ($monthlyData as $month => $data) {
            // Only seed up to current month
            if ($month > $currentMonth) continue;

            $savings = $data['income'] - $data['expenses'];

            // Financial record
            FinancialRecord::updateOrCreate(
                ['user_id' => $user->id, 'year' => $year, 'month' => $month],
                [
                    'monthly_income'   => $data['income'],
                    'monthly_expenses' => $data['expenses'],
                ]
            );

            // Budgets for this month
            $monthStr = sprintf('%04d-%02d', $year, $month);
            $budgetDefs = [
                'Food'          => 400,
                'Transport'     => 150,
                'Rent'          => 700,
                'Entertainment' => 100,
                'Shopping'      => 200,
                'Bills'         => 120,
                'Health'        => 80,
                'Emergency Fund'=> 200,
                'Vacation'      => 100,
            ];
            foreach ($budgetDefs as $catName => $amount) {
                if (isset($cats[$catName])) {
                    Budget::updateOrCreate(
                        ['user_id' => $user->id, 'category_id' => $cats[$catName]->id, 'month' => $monthStr],
                        ['amount' => $amount]
                    );
                }
            }

            // Transactions — realistic mix per month
            $txDefs = [
                // Fixed monthly
                ['desc' => 'Rent',             'amount' => 700.00,  'type' => 'expense', 'cat' => 'Rent',          'day' => 1],
                ['desc' => 'Internet',         'amount' => 39.99,   'type' => 'expense', 'cat' => 'Bills',         'day' => 10],
                ['desc' => 'Phone Bill',       'amount' => 25.00,   'type' => 'expense', 'cat' => 'Bills',         'day' => 15],
                ['desc' => 'Netflix',          'amount' => 15.99,   'type' => 'expense', 'cat' => 'Entertainment', 'day' => 1],
                ['desc' => 'Spotify',          'amount' => 9.99,    'type' => 'expense', 'cat' => 'Entertainment', 'day' => 1],
                ['desc' => 'Gym',              'amount' => 35.00,   'type' => 'expense', 'cat' => 'Health',        'day' => 5],
                ['desc' => 'Monthly Salary',   'amount' => 3500.00, 'type' => 'income',  'cat' => 'Salary',        'day' => 25],
                ['desc' => 'Supermarket',      'amount' => 95.50,   'type' => 'expense', 'cat' => 'Food',          'day' => 3],
                ['desc' => 'Supermarket',      'amount' => 88.20,   'type' => 'expense', 'cat' => 'Food',          'day' => 12],
                ['desc' => 'Supermarket',      'amount' => 102.30,  'type' => 'expense', 'cat' => 'Food',          'day' => 20],
                ['desc' => 'Fuel',             'amount' => 60.00,   'type' => 'expense', 'cat' => 'Transport',     'day' => 8],
                ['desc' => 'Fuel',             'amount' => 55.00,   'type' => 'expense', 'cat' => 'Transport',     'day' => 22],
                ['desc' => 'Emergency Fund',   'amount' => 200.00,  'type' => 'expense', 'cat' => 'Emergency Fund','day' => 28],
            ];

            // Variable transactions per month
            $variableTx = [
                1  => [['desc' => 'New Year Dinner',    'amount' => 85.00,  'type' => 'expense', 'cat' => 'Food',          'day' => 1],
                       ['desc' => 'Clothes',            'amount' => 120.00, 'type' => 'expense', 'cat' => 'Shopping',      'day' => 5]],
                2  => [['desc' => 'Valentine\'s Dinner','amount' => 65.00,  'type' => 'expense', 'cat' => 'Food',          'day' => 14]],
                3  => [['desc' => 'Freelance Project',  'amount' => 300.00, 'type' => 'income',  'cat' => 'Freelance',     'day' => 15],
                       ['desc' => 'Books',              'amount' => 45.00,  'type' => 'expense', 'cat' => 'Shopping',      'day' => 10]],
                4  => [['desc' => 'Easter Travel',      'amount' => 380.00, 'type' => 'expense', 'cat' => 'Vacation',      'day' => 9],
                       ['desc' => 'Restaurant',         'amount' => 55.00,  'type' => 'expense', 'cat' => 'Food',          'day' => 20]],
                5  => [['desc' => 'Online Shopping',    'amount' => 89.00,  'type' => 'expense', 'cat' => 'Shopping',      'day' => 18]],
                6  => [['desc' => 'Side Income',        'amount' => 700.00, 'type' => 'income',  'cat' => 'Side Income',   'day' => 5],
                       ['desc' => 'Summer Clothes',     'amount' => 180.00, 'type' => 'expense', 'cat' => 'Shopping',      'day' => 12],
                       ['desc' => 'Weekend Trip',       'amount' => 250.00, 'type' => 'expense', 'cat' => 'Vacation',      'day' => 22]],
                7  => [['desc' => 'Holiday Flight',     'amount' => 320.00, 'type' => 'expense', 'cat' => 'Vacation',      'day' => 5],
                       ['desc' => 'Hotel',              'amount' => 420.00, 'type' => 'expense', 'cat' => 'Vacation',      'day' => 6],
                       ['desc' => 'Sunglasses',         'amount' => 75.00,  'type' => 'expense', 'cat' => 'Shopping',      'day' => 15]],
                8  => [['desc' => 'Back to School',     'amount' => 150.00, 'type' => 'expense', 'cat' => 'Shopping',      'day' => 25],
                       ['desc' => 'Doctor Visit',       'amount' => 60.00,  'type' => 'expense', 'cat' => 'Health',        'day' => 14]],
                9  => [['desc' => 'Freelance Project',  'amount' => 400.00, 'type' => 'income',  'cat' => 'Freelance',     'day' => 20],
                       ['desc' => 'Concert Tickets',    'amount' => 90.00,  'type' => 'expense', 'cat' => 'Entertainment', 'day' => 8]],
                10 => [['desc' => 'Dentist',            'amount' => 120.00, 'type' => 'expense', 'cat' => 'Health',        'day' => 11],
                       ['desc' => 'Autumn Jacket',      'amount' => 95.00,  'type' => 'expense', 'cat' => 'Shopping',      'day' => 20]],
                11 => [['desc' => 'Black Friday',       'amount' => 280.00, 'type' => 'expense', 'cat' => 'Shopping',      'day' => 29],
                       ['desc' => 'Cinema',             'amount' => 22.00,  'type' => 'expense', 'cat' => 'Entertainment', 'day' => 10]],
                12 => [['desc' => 'Christmas Gifts',    'amount' => 450.00, 'type' => 'expense', 'cat' => 'Shopping',      'day' => 20],
                       ['desc' => 'Christmas Dinner',   'amount' => 120.00, 'type' => 'expense', 'cat' => 'Food',          'day' => 25],
                       ['desc' => 'Year-end Bonus',     'amount' => 1000.00,'type' => 'income',  'cat' => 'Salary',        'day' => 20],
                       ['desc' => 'New Year Party',     'amount' => 95.00,  'type' => 'expense', 'cat' => 'Entertainment', 'day' => 31]],
            ];

            $allTx = array_merge($txDefs, $variableTx[$month] ?? []);

            foreach ($allTx as $tx) {
                $day = min($tx['day'], cal_days_in_month(CAL_GREGORIAN, $month, $year));
                $date = sprintf('%04d-%02d-%02d', $year, $month, $day);

                Transaction::firstOrCreate(
                    [
                        'user_id'          => $user->id,
                        'description'      => $tx['desc'],
                        'transaction_date' => $date,
                        'amount'           => $tx['amount'],
                    ],
                    [
                        'type'        => $tx['type'],
                        'category_id' => $cats[$tx['cat']]->id,
                    ]
                );
            }
        }

        $this->command->info("✓ Demo data seeded for admin@vendora.com ({$currentMonth} months of data)");
    }
}
