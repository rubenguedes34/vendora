<?php

namespace App\Filament\Widgets;

use App\Models\Investment;
use Filament\Widgets\ChartWidget;

class InvestmentsByTypeChart extends ChartWidget
{
    protected ?string $heading = 'Investments by Type';

    protected int|string|array $columnSpan = 2;

    protected function getData(): array
    {
        $data = Investment::selectRaw('type, count(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->toArray();

        return [
            'datasets' => [
                [
                    'label' => 'Investments',
                    'data' => array_values($data),
                    'backgroundColor' => [
                        '#f59e0b',
                        '#3b82f6',
                        '#10b981',
                        '#ef4444',
                        '#8b5cf6',
                    ],
                ],
            ],
            'labels' => array_keys($data),
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}
