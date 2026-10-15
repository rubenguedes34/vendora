<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Models\User;
use Filament\Actions;
use Filament\Forms;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Role;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    // The model policy describes what a user may do through the API; panel
    // access keeps being decided by the admin permissions alone.
    protected static bool $shouldSkipAuthorization = true;

    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-users';

    protected static string|\UnitEnum|null $navigationGroup = 'Access';

    public static function canAccess(): bool
    {
        return auth()->user()?->can('manage users') ?? false;
    }

    // Filament asks the resource (not canDelete) before every delete, and
    // $shouldSkipAuthorization bypasses UserPolicy, so the API's self and
    // last-admin rules are enforced here for the edit page and the bulk action.
    public static function getDeleteAuthorizationResponse(Model $record): Response
    {
        return static::isSelf($record)
            ? Response::deny('You cannot delete your own account.')
            : (static::isLastAdmin($record)
                ? Response::deny('You cannot delete the last admin.')
                : Response::allow());
    }

    private static function isSelf(Model $record): bool
    {
        return auth()->id() === $record->getKey();
    }

    private static function isLastAdmin(Model $record): bool
    {
        return $record->hasRole('admin') && User::role('admin')->count() <= 1;
    }

    private static function isProtected(Model $record): bool
    {
        return static::isSelf($record) || static::isLastAdmin($record);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Forms\Components\TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('email')
                    ->email()
                    ->required()
                    ->maxLength(255),
                Forms\Components\TextInput::make('google_id')
                    ->maxLength(255),
                Forms\Components\TextInput::make('monthly_income')
                    ->required()
                    ->numeric()
                    ->default(0.00),
                Forms\Components\TextInput::make('monthly_expenses')
                    ->required()
                    ->numeric()
                    ->default(0.00),
                Forms\Components\DateTimePicker::make('email_verified_at'),
                Forms\Components\TextInput::make('password')
                    ->password()
                    ->required(fn (string $context): bool => $context === 'create')
                    ->maxLength(255),
                Forms\Components\Select::make('roles')
                    ->relationship('roles', 'name')
                    ->multiple()
                    ->searchable()
                    ->preload()
                    ->disabled(fn (?Model $record): bool => $record !== null && static::isProtected($record))
                    // Disabled fields still sync on save, so they must not be dehydrated either.
                    ->dehydrated(fn (?Model $record): bool => $record === null || static::isProtected($record) === false),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('google_id')
                    ->searchable(),
                Tables\Columns\TextColumn::make('monthly_income')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('monthly_expenses')
                    ->numeric()
                    ->sortable(),
                Tables\Columns\TextColumn::make('email_verified_at')
                    ->dateTime()
                    ->sortable(),
                Tables\Columns\TextColumn::make('roles.name')
                    ->label('Roles')
                    ->badge()
                    ->separator(','),
                Tables\Columns\TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->defaultSort('id', 'desc')
            ->filters([
                //
            ])
            ->actions([
                Actions\EditAction::make(),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\BulkAction::make('assignRole')
                        ->icon('heroicon-m-user-plus')
                        ->label('Assign role')
                        ->form([
                            Forms\Components\Select::make('role')
                                ->options(Role::pluck('name', 'name'))
                                ->required(),
                        ])
                        ->action(function (Collection $records, array $data): void {
                            $role = Role::findByName($data['role'], 'web');
                            foreach ($records->reject(fn ($record) => static::isSelf($record)) as $record) {
                                $record->assignRole($role);
                            }
                        })
                        ->deselectRecordsAfterCompletion(),
                    Actions\BulkAction::make('removeRole')
                        ->icon('heroicon-m-user-minus')
                        ->label('Remove role')
                        ->form([
                            Forms\Components\Select::make('role')
                                ->options(Role::pluck('name', 'name'))
                                ->required(),
                        ])
                        ->action(function (Collection $records, array $data): void {
                            $role = Role::findByName($data['role'], 'web');
                            foreach ($records->reject(fn ($record) => static::isSelf($record)) as $record) {
                                if ($role->name === 'admin' && static::isLastAdmin($record)) {
                                    continue;
                                }
                                $record->removeRole($role);
                            }
                        })
                        ->deselectRecordsAfterCompletion(),
                    Actions\DeleteBulkAction::make(),
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
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}
