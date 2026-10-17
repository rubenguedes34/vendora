<?php

namespace Tests\Feature;

use Illuminate\Console\Scheduling\Schedule;
use Tests\TestCase;

class BootstrapTest extends TestCase
{
    public function test_recurrent_process_is_scheduled_monthly_without_overlap(): void
    {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($e) => str_contains($e->command, 'recurrent:process'));

        $this->assertNotNull($event);
        $this->assertSame('0 0 1 * *', $event->expression);
        $this->assertTrue($event->withoutOverlapping);
        $this->assertTrue($event->runInBackground);
    }

    public function test_api_group_is_throttled_to_60_requests_per_minute(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/budgets')->assertStatus(401);
        }

        $this->getJson('/api/budgets')->assertStatus(429);
    }
}
