<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Model;

/**
 * Shared policy for every model that belongs to a single user through user_id.
 */
class OwnedByUserPolicy
{
    public function view(User $user, Model $record): Response
    {
        return $this->owns($user, $record);
    }

    public function update(User $user, Model $record): Response
    {
        return $this->owns($user, $record);
    }

    public function delete(User $user, Model $record): Response
    {
        return $this->owns($user, $record);
    }

    /**
     * Someone else's record answers exactly like a missing one, so the API
     * never reveals which ids exist.
     */
    private function owns(User $user, Model $record): Response
    {
        return (int) $record->getAttribute('user_id') === $user->id
            ? Response::allow()
            : Response::denyAsNotFound('No query results for model ['.$record::class.'] '.$record->getKey());
    }
}
