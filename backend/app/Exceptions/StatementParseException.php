<?php

namespace App\Exceptions;

use RuntimeException;

/** The message is a fixed code (unreadable_pdf, unsupported_format, balance_mismatch): never statement text. */
class StatementParseException extends RuntimeException {}
