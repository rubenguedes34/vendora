<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A spending limit the user set for the current month.
 *
 * @property int $id
 * @property int $user_id
 * @property string $type
 * @property int|null $category_id
 * @property string $threshold
 * @property bool $is_active
 */
class AlertRule extends Model
{
    public const TYPE_CATEGORY_LIMIT = 'category_limit';

    public const TYPE_TOTAL_SPEND_LIMIT = 'total_spend_limit';

    protected $fillable = [
        'user_id',
        'type',
        'category_id',
        'threshold',
        'is_active',
    ];

    /** @var array<array-key, mixed> */
    protected $casts = [
        'threshold' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
