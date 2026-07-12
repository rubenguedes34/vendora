<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Services\TokenService;

class TokenServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_issue_returns_non_empty_string(): void
    {
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }

    public function test_verify_returns_user_for_valid_token(): void
    {
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $result = TokenService::verify($token);

        $this->assertNotNull($result);
        $this->assertEquals($user->id, $result->id);
        $this->assertEquals($user->email, $result->email);
    }

    public function test_verify_returns_null_for_invalid_token(): void
    {
        $this->assertNull(TokenService::verify('not-a-valid-token'));
        $this->assertNull(TokenService::verify(''));
        $this->assertNull(TokenService::verify('aaa.bbb.ccc'));
    }

    public function test_verify_returns_null_for_tampered_payload(): void
    {
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $parts = explode('.', $token);
        $parts[0] = base64_encode('tampered_payload');
        $tampered = implode('.', $parts);

        $this->assertNull(TokenService::verify($tampered));
    }

    public function test_verify_returns_null_for_forged_unsigned_token(): void
    {
        $user = User::factory()->create();
        $forged = base64_encode($user->id . ':' . time() . ':' . $user->email);

        $this->assertNull(TokenService::verify($forged));
    }

    public function test_different_users_get_different_tokens(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $tokenA = TokenService::issue($userA);
        $tokenB = TokenService::issue($userB);

        $this->assertNotEquals($tokenA, $tokenB);
    }
}
