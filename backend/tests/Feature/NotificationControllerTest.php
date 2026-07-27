<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->token = TokenService::issue($this->user);
    }

    private function authHeader(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_notifications_require_authentication(): void
    {
        $this->getJson('/api/notifications')->assertStatus(401);
    }

    public function test_user_can_read_mark_and_delete_own_notifications(): void
    {
        $unread = $this->user->appNotifications()->create([
            'type' => 'test',
            'title' => 'Unread',
            'body' => 'Body',
            'data' => ['key' => 'unread'],
        ]);
        $read = $this->user->appNotifications()->create([
            'type' => 'test',
            'title' => 'Read',
            'body' => 'Body',
            'data' => ['key' => 'read'],
            'is_read' => true,
        ]);

        $this->getJson('/api/notifications?unread_only=true', $this->authHeader())
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $unread->id]);

        $countResponse = $this->getJson('/api/notifications/unread-count', $this->authHeader())
            ->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $countResponse->json('count'));

        $this->patchJson("/api/notifications/{$unread->id}/read", [], $this->authHeader())
            ->assertStatus(200)
            ->assertJsonPath('is_read', true);

        $this->patchJson('/api/notifications/read-all', [], $this->authHeader())
            ->assertStatus(200);

        $this->deleteJson("/api/notifications/{$read->id}", [], $this->authHeader())
            ->assertStatus(200);
    }

    public function test_user_cannot_manage_another_users_notification(): void
    {
        $notification = User::factory()->create()->appNotifications()->create([
            'type' => 'test',
            'title' => 'Private',
            'data' => ['key' => 'private'],
        ]);

        $this->deleteJson("/api/notifications/{$notification->id}", [], $this->authHeader())
            ->assertStatus(404);
    }
}
