<?php

namespace App\Models;

use App\Services\FinancialCacheService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $category_id
 * @property string $description
 * @property string $amount
 * @property string $type
 * @property \Carbon\Carbon $transaction_date
 * @property string|null $notes
 * @property string|null $attachment_path
 * @property \Illuminate\Database\Eloquent\Collection<Tag> $tags
 */
class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'description',
        'amount',
        'type',
        'transaction_date',
        'notes',
        'attachment_path',
    ];

    /** @var array<array-key, mixed> */
    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
        'type' => 'string',
    ];

    protected static function boot(): void
    {
        parent::boot();

        static::saved(function (self $transaction): void {
            FinancialCacheService::clearForUser($transaction->user);
        });

        static::deleted(function (self $transaction): void {
            FinancialCacheService::clearForUser($transaction->user);
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'transaction_tag');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
