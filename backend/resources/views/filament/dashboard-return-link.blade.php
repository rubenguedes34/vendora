@if (filament()->auth()->check())
    <a
        href="{{ config('app.frontend_url') }}/dashboard"
        class="group flex items-center gap-1.5 mr-6 pr-6 border-r border-gray-700/40 text-xs font-medium text-gray-400 hover:text-white transition-colors"
        title="Back to Vendora Dashboard"
    >
        <x-filament::icon icon="heroicon-m-arrow-left" class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span class="hidden sm:inline">Back to Dashboard</span>
    </a>
@endif
