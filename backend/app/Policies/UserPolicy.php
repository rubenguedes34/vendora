<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Guards the admin user-management actions. Who may reach them at all is
 * decided by the route permissions; this only stops admins acting on themselves.
 */
class UserPolicy
{
    public function updateRole(User $user, User $target): Response
    {
        return $this->notSelf($user, $target, 'You cannot change your own role.');
    }

    public function toggleBlacklist(User $user, User $target): Response
    {
        return $this->notSelf($user, $target, 'You cannot blacklist yourself.');
    }

    public function delete(User $user, User $target): Response
    {
        return $this->notSelf($user, $target, 'You cannot delete your own account.');
    }

    private function notSelf(User $user, User $target, string $message): Response
    {
        return $user->id === $target->id
            ? Response::denyWithStatus(422, $message)
            : Response::allow();
    }
}
