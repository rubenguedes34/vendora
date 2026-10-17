<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        // Header-based so unauthenticated endpoints (login, register) are translated too.
        $first = strtolower(trim(explode(',', (string) $request->header('Accept-Language'))[0]));

        app()->setLocale(str_starts_with($first, 'pt') ? 'pt' : 'en');

        return $next($request);
    }
}
