<?php

namespace App\Http\Requests;

use Illuminate\Auth\Access\Response;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

/**
 * Base for requests that change one existing record: the record is looked up
 * and authorised before validation, so a missing record is a 404 rather than
 * a validation error.
 *
 * @template TModel of Model
 */
abstract class RecordRequest extends FormRequest
{
    /** @var TModel|null */
    private ?Model $record = null;

    public function authorize(): Response
    {
        return Gate::inspect('update', $this->record());
    }

    /**
     * @return TModel
     */
    public function record(): Model
    {
        return $this->record ??= $this->findRecord();
    }

    /**
     * @return TModel
     */
    abstract protected function findRecord(): Model;
}
