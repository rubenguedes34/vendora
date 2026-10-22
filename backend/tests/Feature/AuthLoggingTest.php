<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class AuthLoggingTest extends TestCase
{
    use RefreshDatabase;

    public function test_invalid_token_is_logged_with_ip(): void
    {
        Log::shouldReceive('channel')->with('auth')->atLeast()->once()->andReturnSelf();
        Log::shouldReceive('warning')->once()->withArgs(
            fn ($msg, $ctx) => $msg === 'Invalid or expired token'
                && isset($ctx['ip'])
                && ! str_contains(json_encode($ctx), 'not-a-real-token')
        );

        $this->getJson('/api/notifications', ['Authorization' => 'Bearer not-a-real-token'])->assertStatus(401);
    }

    public function test_blacklisted_account_is_logged(): void
    {
        $user = User::factory()->create(['blacklisted_at' => now()]);
        $token = TokenService::issue($user);
        Log::shouldReceive('channel')->with('auth')->atLeast()->once()->andReturnSelf();
        Log::shouldReceive('warning')->once()->withArgs(
            fn ($msg, $ctx) => $msg === 'Blacklisted account blocked' && $ctx['user_id'] === $user->id
        );

        $this->getJson('/api/notifications', ['Authorization' => 'Bearer '.$token])->assertStatus(403);
    }

    public function test_bad_credentials_are_logged_without_secrets(): void
    {
        User::factory()->create(['email' => 'a@example.com']);
        Log::shouldReceive('channel')->with('auth')->atLeast()->once()->andReturnSelf();
        Log::shouldReceive('warning')->once()->withArgs(
            fn ($msg, $ctx) => $msg === 'Login failed: bad credentials'
                && isset($ctx['ip'])
                && ! str_contains(json_encode($ctx), 'a@example.com')
                && ! str_contains(json_encode($ctx), 'wrong-password')
        );

        $this->postJson('/api/login', ['email' => 'a@example.com', 'password' => 'wrong-password'])->assertStatus(401);
    }
}
