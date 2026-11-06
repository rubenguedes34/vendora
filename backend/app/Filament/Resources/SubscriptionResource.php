<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SubscriptionResource\Pages;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Laravel\Cashier\Subscription;

/** Read-only view of Stripe subscriptions. Prices and refunds are managed in the Stripe dashboard. */
class SubscriptionResource extends Resource
{
    protected static ?string $model = Subscription::class;

    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-credit-card';

    protected static string|\UnitEnum|null $navigationGroup = 'Billing';

    public static function canAccess(): bool
    {
        return auth()->user()?->can('manage users') ?? false;
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('owner.name')->label('User')->searchable(),
                Tables\Columns\TextColumn::make('owner.email')->label('Email')->searchable(),
                Tables\Columns\TextColumn::make('stripe_status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state) => match ($state) {
                        'active', 'trialing' => 'success',
                        'past_due', 'incomplete' => 'warning',
                        default => 'danger',
                    }),
                Tables\Columns\TextColumn::make('stripe_price')->label('Price id')->toggleable(),
                Tables\Columns\TextColumn::make('ends_at')->label('Ends at')->dateTime()->placeholder('-'),
                Tables\Columns\TextColumn::make('created_at')->label('Started')->dateTime()->sortable(),
            ])
            ->defaultSort('created_at', 'desc')
            ->filters([
                Tables\Filters\SelectFilter::make('stripe_status')->label('Status')->options([
                    'active' => 'Active',
                    'past_due' => 'Past due',
                    'incomplete' => 'Incomplete',
                    'canceled' => 'Canceled',
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => Pages\ListSubscriptions::route('/')];
    }
}
