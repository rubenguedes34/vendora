<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

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

    /**
     * Ensure the category can hold a transaction of the given type: income
     * categories for income, expense or savings categories for expenses.
     */
    public static function assertMatchesTransactionType(int|string $categoryId, string $transactionType): void
    {
        $categoryType = static::whereKey($categoryId)->value('type');
        $allowed = $transactionType === 'income' ? ['income'] : ['expense', 'savings'];

        if (! in_array($categoryType, $allowed, true)) {
            throw ValidationException::withMessages([
                'category_id' => [__('messages.category_type_mismatch', ['type' => __('messages.type_'.$transactionType)])],
            ]);
        }
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function budgets()
    {
        return $this->hasMany(Budget::class);
    }

    public function recurrentTransactions()
    {
        return $this->hasMany(RecurrentTransaction::class);
    }

    public function alertRules()
    {
        return $this->hasMany(AlertRule::class);
    }

    /**
     * Categories are shared and their foreign keys cascade, so deleting one in
     * use would silently wipe other users' records.
     */
    public function isInUse(): bool
    {
        return $this->transactions()->exists()
            || $this->budgets()->exists()
            || $this->recurrentTransactions()->exists()
            || $this->alertRules()->exists();
    }

    protected static function booted(): void
    {
        static::deleting(function (Category $category) {
            if ($category->isInUse()) {
                throw new \LogicException('This category is in use and cannot be deleted.');
            }
        });
    }
}
