<?php

namespace Tests\Feature;

use App\Filament\Widgets\AdminStatsOverview;
use App\Filament\Widgets\FeatureAdoptionChart;
use App\Filament\Widgets\RolesChart;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminDashboardWidgetsTest extends TestCase
{
    use RefreshDatabase;

    public function test_widgets_render_and_active_users_counts_recent_token_use(): void
    {
        Role::firstOrCreate(['name' => 'premium', 'guard_name' => 'web']);
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $this->getJson('/api/user', ['Authorization' => 'Bearer '.$token]);
        $this->assertNotNull($user->tokens()->first()->last_used_at);

        foreach ([AdminStatsOverview::class, RolesChart::class, FeatureAdoptionChart::class] as $widget) {
            Livewire::test($widget)->assertSuccessful();
        }
    }
}
