<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Mockery;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_redirect_route_exists(): void
    {
        $response = $this->get('/auth/google');

        // Should redirect to Google's OAuth URL
        $response->assertStatus(302);
    }

    public function test_google_callback_creates_new_user_and_redirects_with_token(): void
    {
        $abstractUser = Mockery::mock('Laravel\Socialite\Contracts\User');
        $abstractUser->shouldReceive('getId')->andReturn('123456789');
        $abstractUser->shouldReceive('getEmail')->andReturn('google@example.com');
        $abstractUser->shouldReceive('getName')->andReturn('Google User');
        $abstractUser->id = '123456789';
        $abstractUser->email = 'google@example.com';
        $abstractUser->name = 'Google User';
        $abstractUser->user = ['email_verified' => true];

        Socialite::shouldReceive('driver')->with('google')->andReturnSelf();
        Socialite::shouldReceive('user')->andReturn($abstractUser);

        $response = $this->get('/auth/google/callback');

        $response->assertStatus(302);
        $response->assertRedirectContains('/auth/callback?token=');

        $this->assertDatabaseHas('users', [
            'email' => 'google@example.com',
            'google_id' => '123456789',
        ]);
    }

    public function test_google_callback_links_existing_user_by_email(): void
    {
        $user = User::factory()->create([
            'email' => 'google@example.com',
            'google_id' => null,
        ]);

        $abstractUser = Mockery::mock('Laravel\Socialite\Contracts\User');
        $abstractUser->id = '123456789';
        $abstractUser->email = 'google@example.com';
        $abstractUser->name = 'Google User';
        $abstractUser->user = ['email_verified' => true];

        Socialite::shouldReceive('driver')->with('google')->andReturnSelf();
        Socialite::shouldReceive('user')->andReturn($abstractUser);

        $response = $this->get('/auth/google/callback');

        $response->assertStatus(302);
        $response->assertRedirectContains('/auth/callback?token=');

        $this->assertDatabaseHas('users', [
            'email' => 'google@example.com',
            'google_id' => '123456789',
        ]);
    }

    public function test_google_callback_rejects_unverified_email(): void
    {
        $abstractUser = Mockery::mock('Laravel\Socialite\Contracts\User');
        $abstractUser->id = '123456789';
        $abstractUser->email = 'unverified@example.com';
        $abstractUser->name = 'Unverified User';
        $abstractUser->user = ['email_verified' => false];

        Socialite::shouldReceive('driver')->with('google')->andReturnSelf();
        Socialite::shouldReceive('user')->andReturn($abstractUser);

        $response = $this->get('/auth/google/callback');

        $response->assertStatus(302);
        $response->assertRedirectContains('/login?error=');

        $this->assertDatabaseMissing('users', [
            'email' => 'unverified@example.com',
        ]);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
