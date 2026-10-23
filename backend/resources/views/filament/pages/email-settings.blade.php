<x-filament-panels::page>
    <x-filament::section>
        <x-slot name="heading">Master switch</x-slot>
        <x-slot name="description">
            When off, no email leaves the app: alerts, reminders, reports, password reset and email verification.
        </x-slot>

        <label style="display: flex; align-items: center; gap: 0.75rem;">
            <x-filament::input.checkbox wire:model.live="toggles.enabled" />
            <span>{{ $labels['enabled'] }}</span>
        </label>
    </x-filament::section>

    <x-filament::section>
        <x-slot name="heading">Notification emails</x-slot>
        <x-slot name="description">
            Each email is also skipped for users who turned email notifications off in their account.
            Password reset and verification emails ignore these and the user option.
        </x-slot>

        <div style="display: grid; gap: 0.75rem;">
            @foreach ($labels as $key => $label)
                @continue($key === 'enabled')
                <label style="display: flex; align-items: center; gap: 0.75rem;">
                    <x-filament::input.checkbox wire:model.live="toggles.{{ $key }}" :disabled="! ($toggles['enabled'] ?? true)" />
                    <span>{{ $label }}</span>
                </label>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-panels::page>
