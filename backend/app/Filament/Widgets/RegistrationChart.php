<?php

namespace App\Filament\Widgets;

use App\Models\User;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\DB;

class RegistrationChart extends ChartWidget
{
    protected ?string $heading = 'User Registrations';

    protected int|string|array $columnSpan = 2;

    protected function getData(): array
    {
        $monthExpression = match (DB::connection()->getDriverName()) {
            'mysql', 'mariadb' => "DATE_FORMAT(created_at, '%Y-%m')",
            'pgsql' => "TO_CHAR(created_at, 'YYYY-MM')",
            default => "strftime('%Y-%m', created_at)",
        };

        $data = User::query()
            ->select(DB::raw("{$monthExpression} as month"), DB::raw('COUNT(*) as count'))
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('count', 'month')
            ->toArray();

        return [
            'datasets' => [
                [
                    'label' => 'New users',
                    'data' => array_values($data),
                    'backgroundColor' => '#f59e0b',
                    'borderColor' => '#f59e0b',
                    'fill' => false,
                ],
            ],
            'labels' => array_keys($data),
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
