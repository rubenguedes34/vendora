<?php

namespace App\Models;

use Illuminate\Validation\ValidationException;
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

    /**
     * Ensure the category can hold a transaction of the given type: income
     * categories for income, expense or savings categories for expenses.
     */
    public static function assertMatchesTransactionType(int|string $categoryId, string $transactionType): void
    {
        $categoryType = static::whereKey($categoryId)->value('type');
        $allowed = $transactionType === 'income' ? ['income'] : ['expense', 'savings'];

        if (!in_array($categoryType, $allowed, true)) {
            throw ValidationException::withMessages([
                'category_id' => ["The selected category cannot be used for an {$transactionType} transaction."],
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
}
