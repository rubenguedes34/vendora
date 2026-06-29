<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudgetRange extends Model
{
    protected $fillable = [
        'name',
        'min_amount',
        'max_amount',
        'description',
    ];
}
