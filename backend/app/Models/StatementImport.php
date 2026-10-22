<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $user_id
 * @property string $file_hash
 * @property int $rows_imported
 */
class StatementImport extends Model
{
    protected $fillable = ['user_id', 'file_hash', 'period_from', 'period_to', 'rows_imported'];

    protected $casts = ['period_from' => 'date', 'period_to' => 'date'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
