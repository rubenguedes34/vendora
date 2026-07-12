<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;
use App\Models\User;
use App\Services\TokenService;

class AccountControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        /** @var User $user */
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password' => Hash::make('password123'),
            'monthly_income' => 3000,
            'monthly_expenses' => 1500,
        ]);
        $this->user = $user;
        $this->token = TokenService::issue($this->user);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    // --- updateProfile ---

    public function test_update_profile_requires_auth(): void
    {
        $this->putJson('/api/user/profile', ['name' => 'A', 'email' => 'a@b.com'])
            ->assertStatus(401);
    }

    public function test_update_profile_changes_name_and_email(): void
    {
        $this->putJson('/api/user/profile', [
            'name'  => 'Jane Doe',
            'email' => 'jane@example.com',
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('message', 'Profile updated successfully.')
            ->assertJsonPath('user.name', 'Jane Doe')
            ->assertJsonPath('user.email', 'jane@example.com');

        $this->assertDatabaseHas('users', [
            'id'    => $this->user->id,
            'name'  => 'Jane Doe',
            'email' => 'jane@example.com',
        ]);
    }

    public function test_update_profile_updates_monthly_financials(): void
    {
        $this->putJson('/api/user/profile', [
            'name'             => 'John Doe',
            'email'            => 'john@example.com',
            'monthly_income'   => 5000,
            'monthly_expenses' => 2000,
        ], $this->authHeader())
            ->assertStatus(200);

        $this->assertDatabaseHas('users', [
            'id'               => $this->user->id,
            'monthly_income'   => 5000,
            'monthly_expenses' => 2000,
        ]);
    }

    public function test_update_profile_validates_required_fields(): void
    {
        $this->putJson('/api/user/profile', [], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email']);
    }

    public function test_update_profile_rejects_duplicate_email(): void
    {
        /** @var User $other */
        $other = User::factory()->create(['email' => 'taken@example.com']);
        unset($other);

        $this->putJson('/api/user/profile', [
            'name'  => 'John Doe',
            'email' => 'taken@example.com',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_update_profile_allows_keeping_same_email(): void
    {
        $this->putJson('/api/user/profile', [
            'name'  => 'John Updated',
            'email' => 'john@example.com',
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('user.name', 'John Updated');
    }

    // --- updatePassword ---

    public function test_update_password_requires_auth(): void
    {
        $this->putJson('/api/user/password', [
            'current_password'      => 'password123',
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ])->assertStatus(401);
    }

    public function test_update_password_succeeds_with_correct_current_password(): void
    {
        $this->putJson('/api/user/password', [
            'current_password'      => 'password123',
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('message', 'Password updated successfully.');

        $this->user->refresh();
        $this->assertTrue(Hash::check('newpassword1', $this->user->password));
    }

    public function test_update_password_rejects_wrong_current_password(): void
    {
        $this->putJson('/api/user/password', [
            'current_password'      => 'wrongpassword',
            'password'              => 'newpassword1',
            'password_confirmation' => 'newpassword1',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonPath('message', 'Current password is incorrect.');
    }

    public function test_update_password_rejects_mismatched_confirmation(): void
    {
        $this->putJson('/api/user/password', [
            'current_password'      => 'password123',
            'password'              => 'newpassword1',
            'password_confirmation' => 'different123',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }

    public function test_update_password_rejects_short_password(): void
    {
        $this->putJson('/api/user/password', [
            'current_password'      => 'password123',
            'password'              => 'short',
            'password_confirmation' => 'short',
        ], $this->authHeader())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['password']);
    }
}
