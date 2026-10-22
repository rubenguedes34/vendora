<?php

namespace App\Filament\Pages;

use App\Services\LogReader;
use Filament\Pages\Page;
use UnitEnum;

class Logs extends Page
{
    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-document-text';

    protected static string|UnitEnum|null $navigationGroup = 'Troubleshooting';

    protected string $view = 'filament.pages.logs';

    public string $area = 'auth';

    public ?string $file = null;

    /** Filter values kept per tab: ['auth' => ['level' => 'ERROR', 'search' => '', 'user_id' => '5']]. */
    public array $filters = [];

    public int $lines = 200;

    /** Context fields each tab can be filtered by (besides level and search). */
    public const CONTEXT_FILTERS = [
        'auth' => ['user_id', 'ip'],
        'import' => ['user_id', 'code'],
        'ai' => ['user_id', 'model'],
        'market' => ['provider', 'status', 'symbol'],
        'scheduler' => ['month', 'recurrent_id'],
        'app' => ['user_id', 'route'],
    ];

    public static function canAccess(): bool
    {
        return auth()->user()?->can('manage users') ?? false;
    }

    public function mount(): void
    {
        $this->updatedArea();
    }

    public function updatedArea(): void
    {
        $reader = new LogReader;
        $this->area = in_array($this->area, $reader->areas(), true) ? $this->area : 'auth';
        $this->file = $reader->files($this->area)[0] ?? null;
    }

    protected function getViewData(): array
    {
        $reader = new LogReader;

        $filters = $this->filters[$this->area] ?? [];
        $contextFilters = self::CONTEXT_FILTERS[$this->area] ?? [];

        return [
            'areas' => $reader->areas(),
            'files' => $reader->files($this->area),
            'contextFilters' => $contextFilters,
            'entries' => $this->file ? $reader->tail(
                $this->file,
                max(1, min($this->lines, 1000)),
                $filters['level'] ?? null,
                $filters['search'] ?? null,
                array_intersect_key($filters, array_flip($contextFilters)),
            ) : [],
        ];
    }
}
