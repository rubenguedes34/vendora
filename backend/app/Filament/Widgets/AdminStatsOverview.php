<?php

namespace App\Filament\Widgets;

use App\Models\Investment;
use App\Models\Transaction;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class AdminStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('Total Users', User::count())
                ->description('Registered users')
                ->descriptionIcon('heroicon-m-users')
                ->color('primary'),
            Stat::make('Active Users', User::whereNull('blacklisted_at')->count())
                ->description('Non-blacklisted users')
                ->descriptionIcon('heroicon-m-user-circle')
                ->color('success'),
            Stat::make('Total Investments', Investment::count())
                ->description('Investment records')
                ->descriptionIcon('heroicon-m-chart-pie')
                ->color('warning'),
            Stat::make('Total Transactions', Transaction::count())
                ->description('All-time transactions')
                ->descriptionIcon('heroicon-m-currency-euro')
                ->color('info'),
        ];
    }
}
