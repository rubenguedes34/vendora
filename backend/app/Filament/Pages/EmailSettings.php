<?php

namespace App\Filament\Pages;

use App\Models\Setting;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use UnitEnum;

class EmailSettings extends Page
{
    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-envelope';

    protected static string|UnitEnum|null $navigationGroup = 'Settings';

    protected static ?string $navigationLabel = 'Email';

    protected static ?string $title = 'Email notifications';

    protected string $view = 'filament.pages.email-settings';

    /** Short key (setting is 'mail.<key>') => on/off, saved as soon as a toggle changes. */
    public array $toggles = [];

    /** Label per short key; no dots, because Livewire reads them as nesting. */
    public const LABELS = [
        'enabled' => 'Send emails',
        'budget' => 'Budget exceeded',
        'alert_rule' => 'Spending limit reached (alert rules)',
        'recurring_due' => 'Recurring transaction due',
        'monthly_report' => 'Monthly report ready',
    ];

    public static function canAccess(): bool
    {
        return auth()->user()?->can('manage users') ?? false;
    }

    public function mount(): void
    {
        foreach (array_keys(self::LABELS) as $key) {
            $this->toggles[$key] = (bool) Setting::get('mail.'.$key, true);
        }
    }

    protected function getViewData(): array
    {
        return ['labels' => self::LABELS];
    }

    public function updatedToggles($value, string $key): void
    {
        abort_unless(static::canAccess() && isset(self::LABELS[$key]), 403);

        Setting::set('mail.'.$key, (bool) $value);

        Notification::make()->title('Saved')->success()->send();
    }
}
