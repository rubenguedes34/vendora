<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $question
 * @property string $answer
 * @property string|null $question_pt
 * @property string|null $answer_pt
 * @property array $keywords
 */
class Faq extends Model
{
    use HasFactory;

    protected $fillable = [
        'question',
        'answer',
        'question_pt',
        'answer_pt',
        'keywords',
    ];

    /** Portuguese text when the request locale is pt and a translation exists; English otherwise. */
    public function localized(string $field): string
    {
        return (app()->getLocale() === 'pt' ? $this->{$field.'_pt'} : null) ?: $this->{$field};
    }

    protected $casts = [
        'keywords' => 'array',
    ];
}
