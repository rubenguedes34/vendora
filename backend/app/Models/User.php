<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string|null $password
 * @property float|null $monthly_income
 * @property float|null $monthly_expenses
 * @property string|null $google_id
 * @property \Carbon\Carbon|null $blacklisted_at
 * @property float $savings
 */
class User extends Authenticatable implements FilamentUser
{
    use HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'monthly_income',
        'monthly_expenses',
        'google_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<array-key, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = ['savings'];

    public function getSavingsAttribute(): float
    {
        return (float) $this->monthly_income - (float) $this->monthly_expenses;
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }

    public function investments()
    {
        return $this->hasMany(Investment::class);
    }

    public function financialRecords()
    {
        return $this->hasMany(FinancialRecord::class);
    }

    public function recurrentTransactions()
    {
        return $this->hasMany(RecurrentTransaction::class);
    }

    public function tags()
    {
        return $this->hasMany(Tag::class);
    }

    public function appNotifications()
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * The attributes that should be cast.
     *
     * @var array<array-key, mixed>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'blacklisted_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function isBlacklisted(): bool
    {
        return $this->blacklisted_at !== null;
    }

    public function hasAdminAccess(): bool
    {
        return $this->hasAnyRole(['admin', 'manager']);
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->can('access admin panel');
    }
}
