<?php

namespace Tests\Feature;

use App\Filament\Resources\SubscriptionResource;
use App\Filament\Resources\SubscriptionResource\Pages\ListSubscriptions;
use App\Models\User;
use App\Services\PremiumAccess;
use App\Services\TokenService;
use Database\Seeders\RoleSeeder;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Cashier\Subscription;
use Livewire\Livewire;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'whsec_test';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        config(['cashier.webhook.secret' => self::SECRET, 'billing.plans.monthly' => 'price_m', 'billing.plans.yearly' => null, 'cashier.secret' => 'sk_test_x']);
    }

    private function user(string $role = 'user'): User
    {
        $user = User::factory()->create(['stripe_id' => 'cus_'.uniqid()]);
        $user->assignRole($role);

        return $user;
    }

    private function auth(User $user): array
    {
        return ['Authorization' => 'Bearer '.TokenService::issue($user)];
    }

    /** Post a Stripe event signed the way Stripe does it. */
    private function webhook(string $type, User $user, string $status, ?int $endedAt = null, string $id = 'sub_1'): TestResponse
    {
        $payload = json_encode(['id' => 'evt_'.uniqid(), 'type' => $type, 'data' => ['object' => [
            'id' => $id, 'customer' => $user->stripe_id, 'status' => $status,
            'ended_at' => $endedAt, 'cancel_at_period_end' => false, 'cancel_at' => null,
            'items' => ['data' => [['id' => 'si_1', 'quantity' => 1, 'price' => ['id' => 'price_m', 'product' => 'prod_1']]]],
        ]]]);
        $t = time();
        $sig = hash_hmac('sha256', $t.'.'.$payload, self::SECRET);

        return $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_STRIPE_SIGNATURE' => "t=$t,v1=$sig",
        ], $payload);
    }

    public function test_free_user_cannot_use_investments_but_premium_can(): void
    {
        $free = $this->user();
        $this->getJson('/api/investments', $this->auth($free))->assertForbidden();

        $this->getJson('/api/investments', $this->auth($this->user('premium')))->assertOk();
    }

    public function test_webhook_without_secret_configured_is_refused(): void
    {
        config(['cashier.webhook.secret' => null]);
        $this->postJson('/api/stripe/webhook', ['type' => 'x'])->assertStatus(503);
    }

    public function test_webhook_with_bad_signature_is_refused_and_grants_nothing(): void
    {
        $user = $this->user();
        $this->call('POST', '/api/stripe/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_STRIPE_SIGNATURE' => 't='.time().',v1=bad',
        ], json_encode(['type' => 'customer.subscription.created', 'data' => ['object' => ['customer' => $user->stripe_id]]]))
            ->assertForbidden();

        $this->assertTrue($user->fresh()->hasRole('user'));
    }

    public function test_subscription_lifecycle_moves_the_role(): void
    {
        $user = $this->user();

        $this->webhook('customer.subscription.created', $user, 'active')->assertOk();
        $this->assertTrue($user->fresh()->hasRole('premium'));
        $this->assertTrue($user->fresh()->can('view investments'));

        // Repeated delivery changes nothing.
        $this->webhook('customer.subscription.created', $user, 'active')->assertOk();
        $this->assertSame(1, $user->subscriptions()->count());

        // Failed renewal: Stripe is still retrying, premium stays.
        $this->webhook('customer.subscription.updated', $user, 'past_due')->assertOk();
        $this->assertTrue($user->fresh()->hasRole('premium'));

        $this->webhook('customer.subscription.deleted', $user, 'canceled', time() - 10)->assertOk();
        $this->assertTrue($user->fresh()->hasRole('user'));
        $this->assertFalse($user->fresh()->hasRole('premium'));
    }

    public function test_incomplete_payment_does_not_grant_premium(): void
    {
        $user = $this->user();
        $this->webhook('customer.subscription.created', $user, 'incomplete')->assertOk();
        $this->assertTrue($user->fresh()->hasRole('user'));
    }

    public function test_admin_and_manual_premium_are_never_touched_by_webhooks(): void
    {
        $admin = $this->user('admin');
        $this->webhook('customer.subscription.deleted', $admin, 'canceled', time() - 10)->assertOk();
        $this->assertTrue($admin->fresh()->hasRole('admin'));

        $comp = $this->user('premium');
        $this->assertNull(PremiumAccess::sync($comp));
        $this->assertTrue($comp->fresh()->hasRole('premium'));
    }

    public function test_show_reports_status_and_plans(): void
    {
        $this->getJson('/api/billing', $this->auth($this->user()))
            ->assertOk()->assertJsonPath('premium', false)->assertJsonPath('plans', ['monthly'])->assertJsonPath('pricing.monthly', 10)->assertJsonPath('pricing.yearly', 108)->assertJsonPath('pricing.discount', 10);
    }

    public function test_checkout_validates_plan_and_refuses_unconfigured_or_duplicate(): void
    {
        $user = $this->user();
        $this->postJson('/api/billing/checkout', ['plan' => 'weekly'], $this->auth($user))->assertStatus(422);
        $this->postJson('/api/billing/checkout', ['plan' => 'yearly'], $this->auth($user))->assertStatus(503);

        // Plan configured but no Stripe secret: 503, not a Stripe SDK 500.
        config(['cashier.secret' => null]);
        $this->postJson('/api/billing/checkout', ['plan' => 'monthly'], $this->auth($user))->assertStatus(503);

        $this->webhook('customer.subscription.created', $user, 'active');
        $this->postJson('/api/billing/checkout', ['plan' => 'monthly'], $this->auth($user))->assertStatus(409);
    }

    public function test_portal_needs_a_billing_account(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/billing/portal', [], $this->auth($user))->assertStatus(409);
        $this->postJson('/api/billing/checkout', ['plan' => 'monthly'])->assertStatus(401);

        $user->forceFill(['stripe_id' => 'cus_x'])->save();
        config(['cashier.secret' => null]);
        $this->postJson('/api/billing/portal', [], $this->auth($user))->assertStatus(503);
    }

    public function test_admin_sees_subscriptions_in_the_panel_and_manager_does_not(): void
    {
        $user = $this->user();
        $this->webhook('customer.subscription.created', $user, 'active')->assertOk();

        $this->actingAs($this->user('manager'));
        $this->assertFalse(SubscriptionResource::canAccess());

        $this->actingAs($this->user('admin'));
        $this->assertTrue(SubscriptionResource::canAccess());
        Filament::setCurrentPanel('admin');
        Livewire::test(ListSubscriptions::class)->assertCanSeeTableRecords(Subscription::all());
    }
}
