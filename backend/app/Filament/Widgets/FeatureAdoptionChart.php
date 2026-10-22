<?php

namespace App\Filament\Widgets;

use App\Models\User;
use Filament\Widgets\ChartWidget;

class FeatureAdoptionChart extends ChartWidget
{
    protected ?string $heading = 'Feature Adoption (users using each)';

    protected function getData(): array
    {
        $data = [
            'Transactions' => User::has('transactions')->count(),
            'Budgets' => User::has('budgets')->count(),
            'Investments' => User::has('investments')->count(),
            'Recurrent' => User::has('recurrentTransactions')->count(),
            'Alert rules' => User::has('alertRules')->count(),
        ];

        return [
            'datasets' => [['label' => 'Users', 'data' => array_values($data), 'backgroundColor' => '#f59e0b']],
            'labels' => array_keys($data),
        ];
    }

    protected function getType(): string
    {
        return 'bar';
    }
}
