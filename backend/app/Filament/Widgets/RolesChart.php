<?php

namespace App\Filament\Widgets;

use Filament\Widgets\ChartWidget;
use Spatie\Permission\Models\Role;

class RolesChart extends ChartWidget
{
    protected ?string $heading = 'Users by Role';

    protected function getData(): array
    {
        $roles = Role::withCount('users')->orderBy('name')->get();

        return [
            'datasets' => [
                [
                    'label' => 'Users',
                    'data' => $roles->pluck('users_count')->all(),
                    'backgroundColor' => ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'],
                ],
            ],
            'labels' => $roles->pluck('name')->all(),
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
    }
}
