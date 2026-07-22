<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class FinancialCacheService
{
    public static function clearForUser(User $user): void
    {
        Cache::forget("health-score:{$user->id}");
        Cache::forget("net-worth:{$user->id}");
    }
}
