<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LocaleTest extends TestCase
{
    use RefreshDatabase;

    private function actingToken(User $user): array
    {
        return ['Authorization' => 'Bearer '.TokenService::issue($user)];
    }

    public function test_new_user_defaults_to_en(): void
    {
        $this->assertSame('en', User::factory()->create()->fresh()->locale);
    }

    public function test_user_can_save_locale(): void
    {
        $user = User::factory()->create();

        $this->putJson('/api/user/locale', ['locale' => 'pt'], $this->actingToken($user))
            ->assertOk()
            ->assertJsonPath('locale', 'pt');

        $this->assertSame('pt', $user->fresh()->locale);
    }

    public function test_login_response_includes_saved_locale(): void
    {
        $user = User::factory()->create(['locale' => 'pt', 'password' => bcrypt('secret123')]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('user.locale', 'pt');
    }

    public function test_locale_endpoint_requires_authentication(): void
    {
        $this->putJson('/api/user/locale', ['locale' => 'pt'])->assertStatus(401);
    }

    public function test_unknown_locale_is_rejected(): void
    {
        $user = User::factory()->create();

        $this->putJson('/api/user/locale', ['locale' => 'fr'], $this->actingToken($user))->assertStatus(422)->assertJsonValidationErrors('locale');
    }

    public function test_accept_language_pt_translates_validation(): void
    {
        $response = $this->postJson('/api/login', [], ['Accept-Language' => 'pt-PT']);

        $response->assertStatus(422);
        $this->assertSame(
            trans('validation.required', ['attribute' => 'email'], 'pt'),
            $response->json('errors.email.0')
        );
        $this->assertNotSame(
            trans('validation.required', ['attribute' => 'email'], 'en'),
            $response->json('errors.email.0')
        );
    }

    public function test_pt_br_header_resolves_to_pt(): void
    {
        $response = $this->postJson('/api/login', [], ['Accept-Language' => 'pt-BR,pt;q=0.9']);

        $this->assertSame(
            trans('validation.required', ['attribute' => 'email'], 'pt'),
            $response->json('errors.email.0')
        );
    }

    public function test_unknown_or_empty_header_falls_back_to_en(): void
    {
        foreach (['fr', ''] as $header) {
            $response = $this->postJson('/api/login', [], ['Accept-Language' => $header]);

            $this->assertSame(
                trans('validation.required', ['attribute' => 'email'], 'en'),
                $response->json('errors.email.0')
            );
        }
    }
}
