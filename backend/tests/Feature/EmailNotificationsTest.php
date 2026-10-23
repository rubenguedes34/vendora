<?php

namespace Tests\Feature;

use App\Filament\Pages\EmailSettings;
use App\Models\Budget;
use App\Models\Category;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\AppAlertMail;
use App\Services\NotificationGenerator;
use App\Services\TokenService;
use Carbon\Carbon;
use Filament\Facades\Filament;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Livewire\Livewire;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EmailNotificationsTest extends TestCase
{
    use RefreshDatabase;

    private function overBudgetUser(): User
    {
        $user = User::factory()->create();
        $category = Category::firstOrCreate(['name' => 'Food', 'type' => 'expense']);
        Budget::create(['user_id' => $user->id, 'category_id' => $category->id, 'amount' => 100, 'month' => now()->format('Y-m')]);
        $user->transactions()->create([
            'category_id' => $category->id,
            'description' => 'Groceries',
            'amount' => 130,
            'type' => 'expense',
            'transaction_date' => now()->toDateString(),
        ]);

        return $user;
    }

    public function test_exceeded_budget_sends_one_email_and_not_again_on_regeneration(): void
    {
        Notification::fake();
        $user = $this->overBudgetUser();

        app(NotificationGenerator::class)->generateFor($user);
        app(NotificationGenerator::class)->generateFor($user);

        Notification::assertSentToTimes($user, AppAlertMail::class, 2); // budget_exceeded + monthly_report_ready
        Notification::assertSentTo($user, AppAlertMail::class, fn ($n) => $n->toMail($user)->subject === 'You exceeded your Food budget');
    }

    public function test_almost_exceeded_budget_is_not_emailed(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_notifications' => true]);
        $category = Category::firstOrCreate(['name' => 'Food', 'type' => 'expense']);
        Budget::create(['user_id' => $user->id, 'category_id' => $category->id, 'amount' => 100, 'month' => now()->format('Y-m')]);
        $user->transactions()->create(['category_id' => $category->id, 'description' => 'x', 'amount' => 85, 'type' => 'expense', 'transaction_date' => now()->toDateString()]);

        app(NotificationGenerator::class)->generateFor($user);

        Notification::assertSentToTimes($user, AppAlertMail::class, 1); // only the monthly report
    }

    public function test_master_switch_type_switch_and_user_opt_out_each_block_the_email(): void
    {
        Notification::fake();

        Setting::set('mail.enabled', false);
        $a = $this->overBudgetUser();
        app(NotificationGenerator::class)->generateFor($a);
        Setting::set('mail.enabled', true);

        Setting::set('mail.budget', false);
        Setting::set('mail.monthly_report', false);
        $b = $this->overBudgetUser();
        app(NotificationGenerator::class)->generateFor($b);
        Setting::set('mail.budget', true);
        Setting::set('mail.monthly_report', true);

        $c = $this->overBudgetUser();
        $c->update(['email_notifications' => false]);
        app(NotificationGenerator::class)->generateFor($c);

        Notification::assertNothingSent();
        // The in-app notification is unaffected.
        $this->assertTrue($a->appNotifications()->where('type', 'budget_exceeded')->exists());
    }

    public function test_email_is_in_the_user_locale(): void
    {
        Notification::fake();
        $user = $this->overBudgetUser();
        $user->update(['locale' => 'pt']);

        app(NotificationGenerator::class)->generateFor($user);

        Notification::assertSentTo($user, AppAlertMail::class, function ($n, $channels) use ($user) {
            // The sender wraps toMail in the notification's locale; the fake does not, so do the same here.
            app()->setLocale($n->locale);
            $subject = $n->toMail($user)->subject;

            return $n->locale === 'pt' && $subject === 'Excedeste o orçamento de Food';
        });
    }

    public function test_report_month_is_right_on_the_31st(): void
    {
        Carbon::setTestNow('2026-03-31 10:00:00');
        $user = User::factory()->make(['name' => 'Ana']);

        $mail = (new AppAlertMail('monthly_report_ready', ['month' => '2026-02']))->toMail($user);

        $this->assertSame('Your February 2026 report is ready', $mail->subject);
        Carbon::setTestNow();
    }

    public function test_generate_command_covers_active_users_only(): void
    {
        Notification::fake();
        $active = $this->overBudgetUser();
        $blocked = $this->overBudgetUser();
        $blocked->forceFill(['blacklisted_at' => now()])->save();

        $this->artisan('notifications:generate')->assertSuccessful();

        $this->assertTrue($active->appNotifications()->exists());
        $this->assertFalse($blocked->appNotifications()->exists());
    }

    public function test_forgot_password_sends_for_known_email_and_answers_the_same_for_unknown(): void
    {
        Notification::fake();
        $user = User::factory()->create();

        $known = $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])->assertOk();

        $this->assertSame($known->json('message'), $unknown->json('message'));
        Notification::assertSentToTimes($user, ResetPassword::class, 1);
        Notification::assertCount(1);
    }

    public function test_reset_link_points_to_the_spa(): void
    {
        $user = User::factory()->create();

        $url = null;
        Notification::fake();
        $this->postJson('/api/forgot-password', ['email' => $user->email]);
        Notification::assertSentTo($user, ResetPassword::class, function ($n) use ($user, &$url) {
            $url = $n->toMail($user)->actionUrl;

            return true;
        });

        $this->assertStringStartsWith(config('app.frontend_url').'/reset-password?token=', $url);
        $this->assertStringContainsString('email='.urlencode($user->email), $url);
    }

    public function test_reset_password_changes_it_and_signs_out_every_session(): void
    {
        $user = User::factory()->create();
        TokenService::issue($user);
        $token = Password::createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token, 'email' => $user->email,
            'password' => 'brand-new-pass', 'password_confirmation' => 'brand-new-pass',
        ])->assertOk();

        $this->assertTrue(password_verify('brand-new-pass', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_reset_password_rejects_a_bad_token(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/reset-password', [
            'token' => 'nope', 'email' => $user->email,
            'password' => 'brand-new-pass', 'password_confirmation' => 'brand-new-pass',
        ])->assertStatus(422);
    }

    public function test_master_switch_off_blocks_account_emails_too(): void
    {
        Notification::fake();
        Setting::set('mail.enabled', false);
        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_user_opt_out_does_not_block_account_emails(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email_notifications' => false]);

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_register_sends_verification_and_signed_link_verifies(): void
    {
        Notification::fake();

        $this->postJson('/api/register', [
            'name' => 'New', 'email' => 'new@example.com',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ])->assertCreated();

        $user = User::where('email', 'new@example.com')->first();
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);

        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);
        $this->get($url)->assertRedirect(config('app.frontend_url').'/login?verified=1');
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_verification_link_needs_a_valid_signature_and_hash(): void
    {
        $user = User::factory()->unverified()->create();

        $this->get("/api/email/verify/{$user->id}/".sha1($user->email))->assertForbidden();

        $bad = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => 'wrong']);
        $this->get($bad)->assertForbidden();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_resend_verification_only_for_unverified_users(): void
    {
        Notification::fake();
        $unverified = User::factory()->unverified()->create();
        $verified = User::factory()->create();

        $this->postJson('/api/email/resend', [], ['Authorization' => 'Bearer '.TokenService::issue($unverified)])->assertOk();
        $this->postJson('/api/email/resend', [], ['Authorization' => 'Bearer '.TokenService::issue($verified)])->assertOk();

        Notification::assertSentTo($unverified, VerifyEmail::class);
        Notification::assertNotSentTo($verified, VerifyEmail::class);
    }

    public function test_changing_email_requires_verification_again(): void
    {
        Notification::fake();
        $user = User::factory()->create(['password' => 'secret-pass-1']);

        $this->putJson('/api/user/profile', [
            'name' => $user->name, 'email' => 'changed@example.com', 'current_password' => 'secret-pass-1',
        ], ['Authorization' => 'Bearer '.TokenService::issue($user)])->assertOk();

        $this->assertNull($user->fresh()->email_verified_at);
        Notification::assertSentTo($user->fresh(), VerifyEmail::class);
    }

    public function test_profile_can_turn_email_notifications_off(): void
    {
        $user = User::factory()->create();

        $this->putJson('/api/user/profile', [
            'name' => $user->name, 'email' => $user->email, 'email_notifications' => false,
        ], ['Authorization' => 'Bearer '.TokenService::issue($user)])->assertOk();

        $this->assertFalse($user->fresh()->email_notifications);
    }

    public function test_admin_can_toggle_email_settings_and_others_cannot(): void
    {
        Permission::firstOrCreate(['name' => 'manage users', 'guard_name' => 'web']);
        Permission::firstOrCreate(['name' => 'access admin panel', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web'])->syncPermissions(['manage users', 'access admin panel']);
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin);
        Filament::setCurrentPanel('admin');
        $this->get('/admin/email-settings')->assertOk();

        Livewire::test(EmailSettings::class)->set('toggles.enabled', false);
        Cache::flush();
        $this->assertFalse(Setting::get('mail.enabled'));

        $this->actingAs(User::factory()->create());
        $this->assertFalse(EmailSettings::canAccess());
    }
}
