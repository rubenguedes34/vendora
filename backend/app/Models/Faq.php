<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $question
 * @property string $answer
 * @property array $keywords
 */
class Faq extends Model
{
    use HasFactory;

    protected $fillable = [
        'question',
        'answer',
        'keywords',
    ];

    protected $casts = [
        'keywords' => 'array',
    ];
}
