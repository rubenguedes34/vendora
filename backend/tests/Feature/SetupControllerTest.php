<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Services\TokenService;

class SetupControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_setup_saves_financial_data_for_user(): void
    {
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $response = $this->postJson('/api/setup', [
            'token' => $token,
            'monthly_income' => 5000,
            'monthly_expenses' => 3000,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message', 'user']);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'monthly_income' => 5000,
            'monthly_expenses' => 3000,
        ]);

        $this->assertDatabaseHas('financial_records', [
            'user_id' => $user->id,
            'year' => date('Y'),
            'month' => date('n'),
            'monthly_income' => 5000,
            'monthly_expenses' => 3000,
        ]);
    }

    public function test_setup_rejects_invalid_token(): void
    {
        $response = $this->postJson('/api/setup', [
            'token' => 'invalid-token',
            'monthly_income' => 5000,
            'monthly_expenses' => 3000,
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Invalid token']);
    }

    public function test_setup_rejects_forged_unsigned_token(): void
    {
        $user = User::factory()->create();
        // A token in the old unsigned base64 format must no longer be accepted.
        $forged = base64_encode($user->id . ':' . time() . ':' . $user->email);

        $response = $this->postJson('/api/setup', [
            'token' => $forged,
            'monthly_income' => 5000,
            'monthly_expenses' => 3000,
        ]);

        $response->assertStatus(401)
            ->assertJson(['message' => 'Invalid token']);

        $this->assertDatabaseMissing('users', [
            'id' => $user->id,
            'monthly_income' => 5000,
        ]);
    }

    public function test_setup_validates_required_fields(): void
    {
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $response = $this->postJson('/api/setup', [
            'token' => $token,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['monthly_income', 'monthly_expenses']);
    }
}
