<x-filament-panels::page>
    <x-filament::tabs>
        @foreach ($areas as $tab)
            <x-filament::tabs.item :active="$tab === $area" wire:click="$set('area', '{{ $tab }}')">
                {{ $tab === 'ai' ? 'AI' : ucfirst($tab) }}
            </x-filament::tabs.item>
        @endforeach
    </x-filament::tabs>

    {{-- Inline: Filament's prebuilt CSS has no grid-cols utilities for custom pages. --}}
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 0.75rem;">
        <x-filament::input.wrapper>
            <x-filament::input.select wire:model.live="file">
                @foreach ($files as $name)
                    <option value="{{ $name }}">{{ $name }}</option>
                @endforeach
            </x-filament::input.select>
        </x-filament::input.wrapper>

        <x-filament::input.wrapper>
            <x-filament::input.select wire:model.live="filters.{{ $area }}.level">
                <option value="">All levels</option>
                @foreach (['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG'] as $lvl)
                    <option value="{{ $lvl }}">{{ $lvl }}</option>
                @endforeach
            </x-filament::input.select>
        </x-filament::input.wrapper>

        <x-filament::input.wrapper>
            <x-filament::input type="search" wire:model.live.debounce.400ms="filters.{{ $area }}.search" placeholder="Search" />
        </x-filament::input.wrapper>

        @foreach ($contextFilters as $field)
            <x-filament::input.wrapper>
                <x-filament::input type="text" wire:model.live.debounce.400ms="filters.{{ $area }}.{{ $field }}" placeholder="{{ $field }}" />
            </x-filament::input.wrapper>
        @endforeach
    </div>

    @if ($entries === [])
        <p class="text-sm text-gray-500 dark:text-gray-400">No log lines to show.</p>
    @else
        <pre class="overflow-x-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-100">@foreach ($entries as $line){{ $line }}
@endforeach</pre>
    @endif
</x-filament-panels::page>
