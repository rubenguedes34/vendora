<?php

namespace App\Filament\Widgets;

use App\Models\User;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\DB;

class RegistrationChart extends ChartWidget
{
    protected static ?string $heading = 'User Registrations';

    protected int|string|array $columnSpan = 2;

    protected function getData(): array
    {
        $data = User::query()
            ->select(DB::raw("strftime('%Y-%m', created_at) as month"), DB::raw('COUNT(*) as count'))
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
