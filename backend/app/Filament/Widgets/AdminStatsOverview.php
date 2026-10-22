<?php

namespace App\Filament\Widgets;

use App\Models\StatementImport;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Laravel\Sanctum\PersonalAccessToken;

class AdminStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $newThisMonth = User::where('created_at', '>=', now()->startOfMonth())->count();
        $newLastMonth = User::whereBetween('created_at', [now()->subMonthNoOverflow()->startOfMonth(), now()->startOfMonth()])->count();

        $active30d = PersonalAccessToken::where('tokenable_type', User::class)
            ->where('last_used_at', '>=', now()->subDays(30))
            ->distinct()
            ->count('tokenable_id');

        return [
            Stat::make('Total Users', User::count())
                ->description('Registered users')
                ->descriptionIcon('heroicon-m-users')
                ->color('primary'),
            Stat::make('New Users This Month', $newThisMonth)
                ->description($newLastMonth.' last month')
                ->descriptionIcon('heroicon-m-user-plus')
                ->color('info'),
            Stat::make('Active Users (30d)', $active30d)
                ->description('Used the app in the last 30 days')
                ->descriptionIcon('heroicon-m-bolt')
                ->color('success'),
            Stat::make('Blacklisted Users', User::whereNotNull('blacklisted_at')->count())
                ->description('Suspended accounts')
                ->descriptionIcon('heroicon-m-no-symbol')
                ->color('danger'),
            Stat::make('Premium Users', User::role('premium')->count())
                ->description('Of '.User::count().' total')
                ->descriptionIcon('heroicon-m-star')
                ->color('warning'),
            Stat::make('Statement Imports', StatementImport::count())
                ->description(StatementImport::where('created_at', '>=', now()->startOfMonth())->count().' this month')
                ->descriptionIcon('heroicon-m-document-arrow-up')
                ->color('info'),
        ];
    }
}
