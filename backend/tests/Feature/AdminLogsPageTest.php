<?php

namespace Tests\Feature;

use App\Filament\Pages\Logs;
use App\Models\User;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminLogsPageTest extends TestCase
{
    use RefreshDatabase;

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = sys_get_temp_dir().'/logspage-'.uniqid();
        mkdir($this->dir);
        file_put_contents($this->dir.'/auth-2026-10-22.log', "[t] local.WARNING: marker-line-123\n");
        config(['logging.reader_path' => $this->dir]);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir.'/*'));
        rmdir($this->dir);
        parent::tearDown();
    }

    private function userWithRole(string $role, array $permissions): User
    {
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web'])->syncPermissions($permissions);

        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_admin_can_open_logs_page(): void
    {
        $this->actingAs($this->userWithRole('admin', ['access admin panel', 'manage users']));

        $this->get('/admin/logs')->assertOk()->assertSee('marker-line-123');
    }

    public function test_non_admin_roles_are_denied(): void
    {
        foreach (['manager' => ['access admin panel', 'view metrics'], 'user' => [], 'premium' => []] as $role => $permissions) {
            $this->actingAs($this->userWithRole($role, $permissions));

            $this->assertContains($this->get('/admin/logs')->status(), [403, 302], $role);
            $this->assertFalse(Logs::canAccess(), $role);
        }
    }

    public function test_selecting_unknown_file_shows_empty_state(): void
    {
        $this->actingAs($this->userWithRole('admin', ['access admin panel', 'manage users']));

        Filament::setCurrentPanel('admin');

        Livewire::test(Logs::class)
            ->set('file', '../.env')
            ->assertOk()
            ->assertSee('No log lines to show.');
    }

    public function test_each_area_tab_shows_only_its_own_files(): void
    {
        file_put_contents($this->dir.'/import-2026-10-22.log', "[t] local.INFO: import-marker-456\n");
        $this->actingAs($this->userWithRole('admin', ['access admin panel', 'manage users']));
        Filament::setCurrentPanel('admin');

        Livewire::test(Logs::class)
            ->assertSet('area', 'auth')
            ->assertSee('marker-line-123')
            ->assertDontSee('import-marker-456')
            ->set('area', 'import')
            ->assertSet('file', 'import-2026-10-22.log')
            ->assertSee('import-marker-456')
            ->assertDontSee('marker-line-123');
    }

    public function test_filters_are_kept_per_tab_and_can_use_context_fields(): void
    {
        file_put_contents($this->dir.'/auth-2026-10-22.log', "[t] local.WARNING: one {\"user_id\":5} []\n[t] local.WARNING: two {\"user_id\":6} []\n");
        file_put_contents($this->dir.'/import-2026-10-22.log', "[t] local.INFO: import-marker-456 {\"user_id\":6} []\n");
        $this->actingAs($this->userWithRole('admin', ['access admin panel', 'manage users']));
        Filament::setCurrentPanel('admin');

        Livewire::test(Logs::class)
            ->set('filters.auth.user_id', '5')
            ->assertSee('one')
            ->assertDontSee('two')
            ->set('area', 'import')
            ->assertSee('import-marker-456')        // auth's user_id=5 filter does not follow to this tab
            ->set('area', 'auth')
            ->assertSet('filters.auth.user_id', '5')  // and is still there when coming back
            ->assertDontSee('two');
    }
}
