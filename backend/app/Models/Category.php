<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $name
 * @property string $type
 * @property string|null $icon
 * @property string|null $color
 */
class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'icon',
        'color',
        'type',
    ];

    protected $casts = [
        'type' => 'string',
    ];

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }
}
