<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class FinancialCacheService
{
    public static function clearForUser(User $user): void
    {
        Cache::forget("health-score:{$user->id}");
        Cache::forget("net-worth:{$user->id}");
        Log::debug('Financial cache cleared', ['user_id' => $user->id]);
    }
}
