<?php

namespace App\Filament\Widgets;

use App\Models\Budget;
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
            Stat::make('New Users This Month', User::whereYear('created_at', now()->year)->whereMonth('created_at', now()->month)->count())
                ->description('Monthly sign-ups')
                ->descriptionIcon('heroicon-m-user-plus')
                ->color('info'),
            Stat::make('Total Investments', Investment::count())
                ->description('Investment records')
                ->descriptionIcon('heroicon-m-chart-pie')
                ->color('warning'),
            Stat::make('Invested Value', (float) Investment::sum('current_amount'))
                ->description('Current portfolio value')
                ->descriptionIcon('heroicon-m-currency-euro')
                ->color('warning'),
            Stat::make('Total Transactions', Transaction::count())
                ->description('All-time transactions')
                ->descriptionIcon('heroicon-m-currency-euro')
                ->color('info'),
            Stat::make('Total Income', (float) Transaction::where('type', 'income')->sum('amount'))
                ->description('All-time income')
                ->descriptionIcon('heroicon-m-arrow-trending-up')
                ->color('success'),
            Stat::make('Total Expenses', (float) Transaction::where('type', 'expense')->sum('amount'))
                ->description('All-time expenses')
                ->descriptionIcon('heroicon-m-arrow-trending-down')
                ->color('danger'),
            Stat::make('Total Budgeted', (float) Budget::sum('amount'))
                ->description('All budgets')
                ->descriptionIcon('heroicon-m-wallet')
                ->color('primary'),
        ];
    }
}
