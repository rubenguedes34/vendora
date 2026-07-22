<?php

namespace App\Filament\Resources;

use App\Filament\Resources\InvestmentResource\Pages;
use App\Filament\Resources\InvestmentResource\RelationManagers;
use App\Models\Investment;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class InvestmentResource extends Resource
{
    protected static ?string $model = Investment::class;

    protected static ?string $navigationIcon = 'heroicon-o-rectangle-stack';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('user_id')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('type')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('account')
                    ->maxLength(100),
                Forms\Components\TextInput::make('ticker_symbol')
                    ->maxLength(255),
                Forms\Components\TextInput::make('initial_amount')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('current_amount')
                    ->required()
                    ->numeric(),
                Forms\Components\TextInput::make('units')
                    ->numeric(),
                Forms\Components\TextInput::make('price_per_unit')
                    ->numeric(),
                Forms\Components\DatePicker::make('purchase_date')
                    ->required(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user_id')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('name')
                    ->searchable(),
                Tables\Columns\TextColumn::make('type')
                    ->searchable(),
                Tables\Columns\TextColumn::make('account')
                    ->searchable(),
                Tables\Columns\TextColumn::make('ticker_symbol')
                    ->searchable(),
                Tables\Columns\TextColumn::make('initial_amount')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('current_amount')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('units')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('price_per_unit')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('purchase_date')
                    ->date()
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListInvestments::route('/'),
            'create' => Pages\CreateInvestment::route('/create'),
            'edit' => Pages\EditInvestment::route('/{record}/edit'),
        ];
    }
}
