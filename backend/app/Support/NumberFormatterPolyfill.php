<?php

declare(strict_types=1);

if (! class_exists('NumberFormatter')) {
    class NumberFormatter
    {
        public const DECIMAL = 1;
        public const CURRENCY = 4;
        public const PERCENT = 3;

        private string $locale;
        private int $style;

        public function __construct(?string $locale = null, int $style = self::DECIMAL, int $pattern = 0)
        {
            $this->locale = $locale ?? 'en';
            $this->style = $style;
        }

        public function format(float|int $num): string
        {
            return match ($this->style) {
                self::CURRENCY => '$' . number_format((float) $num, 2),
                self::PERCENT => number_format((float) $num * 100, 0) . '%',
                default => number_format((float) $num, 2),
            };
        }
    }
}
