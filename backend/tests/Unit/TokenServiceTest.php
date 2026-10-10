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
        /** @var User $user */
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $this->assertNotEmpty($token);
    }

    public function test_verify_returns_user_for_valid_token(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $result = TokenService::verify($token);

        $this->assertNotNull($result);
        $this->assertEquals($user->id, $result->id);
        $this->assertEquals($user->email, $result->email);
    }

    public function test_verify_returns_null_for_invalid_token(): void
    {
        $this->assertNull(TokenService::verify(null));
        $this->assertNull(TokenService::verify('not-a-valid-token'));
        $this->assertNull(TokenService::verify(''));
        $this->assertNull(TokenService::verify('aaa.bbb.ccc'));
    }

    public function test_verify_returns_null_for_tampered_token(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $this->assertNull(TokenService::verify($token . 'x'));
        $this->assertNull(TokenService::verify(substr($token, 0, -1)));
    }

    public function test_verify_returns_null_for_expired_token(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $token = TokenService::issue($user);

        $this->travel((int) config('sanctum.expiration') + 1)->minutes();

        $this->assertNull(TokenService::verify($token));
    }

    public function test_revoke_all_can_keep_the_current_token(): void
    {
        /** @var User $user */
        $user = User::factory()->create();
        $current = TokenService::issue($user);
        $other = TokenService::issue($user);

        TokenService::revokeAll($user, TokenService::find($current));

        $this->assertNotNull(TokenService::verify($current));
        $this->assertNull(TokenService::verify($other));
    }

    public function test_different_users_get_different_tokens(): void
    {
        /** @var User $userA */
        $userA = User::factory()->create();
        /** @var User $userB */
        $userB = User::factory()->create();

        $tokenA = TokenService::issue($userA);
        $tokenB = TokenService::issue($userB);

        $this->assertNotEquals($tokenA, $tokenB);
    }
}
