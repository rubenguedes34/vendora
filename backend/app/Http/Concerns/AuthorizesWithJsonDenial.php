<?php

namespace App\Http\Concerns;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\Gate;

trait AuthorizesWithJsonDenial
{
    /**
     * Check a policy and, when it denies, answer with its message and status
     * as JSON even for clients that did not ask for JSON.
     */
    protected function authorizeOrJson(string $ability, mixed $arguments): void
    {
        $response = Gate::inspect($ability, $arguments);

        if ($response->denied()) {
            throw new HttpResponseException(
                response()->json(['message' => $response->message()], $response->status() ?? 403)
            );
        }
    }
}
