@if (filament()->auth()->check())
    <a
        href="{{ config('app.frontend_url') }}/dashboard"
        class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400"
    >
        <x-filament::icon icon="heroicon-m-arrow-left" class="w-5 h-5" />
        Back to Dashboard
    </a>
@endif
