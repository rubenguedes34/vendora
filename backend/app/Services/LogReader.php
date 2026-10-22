<?php

namespace App\Services;

class LogReader
{
    private const TAIL_BYTES = 512 * 1024;

    /** @return array<int, string> area tabs: the configured channels plus "app" for everything else */
    public function areas(): array
    {
        return [...config('logging.areas'), 'app'];
    }

    /** @return array<int, string> basenames, newest first; limited to one area tab when given */
    public function files(?string $area = null): array
    {
        $paths = glob(config('logging.reader_path').'/*.log') ?: [];
        usort($paths, fn ($a, $b) => filemtime($b) <=> filemtime($a));
        $names = array_map('basename', $paths);

        return $area === null ? $names : array_values(array_filter($names, fn ($n) => $this->areaOf($n) === $area));
    }

    private function areaOf(string $file): string
    {
        foreach (config('logging.areas') as $area) {
            if (str_starts_with($file, $area.'-')) {
                return $area;
            }
        }

        return 'app';
    }

    /** @return array<int, string> newest line last */
    /** @param array<string, string> $context exact-value filters on fields of the JSON context, e.g. ['user_id' => '5'] */
    public function tail(string $file, int $lines = 200, ?string $level = null, ?string $search = null, array $context = []): array
    {
        // Whitelist against the listing so a crafted name can never leave the logs folder.
        if (! in_array($file, $this->files(), true)) {
            return [];
        }

        $path = config('logging.reader_path').'/'.$file;
        // The daily handler may prune the file between the listing and here.
        if (! is_readable($path) || ($handle = @fopen($path, 'r')) === false) {
            return [];
        }
        $size = filesize($path);
        $start = max(0, $size - self::TAIL_BYTES);
        fseek($handle, $start);
        $chunk = stream_get_contents($handle);
        fclose($handle);

        $all = explode("\n", rtrim($chunk, "\n"));
        if ($start > 0) {
            array_shift($all); // first line is cut mid-way
        }

        $context = array_filter($context, fn ($value) => $value !== null && $value !== '');

        // shortcut: stack-trace lines are filtered independently, group by entry if it gets confusing.
        $all = array_filter($all, fn ($line) => ($level === null || $level === '' || str_contains($line, '.'.strtoupper($level).':'))
            && ($search === null || $search === '' || stripos($line, $search) !== false)
            && $this->matchesContext($line, $context));

        return array_slice(array_values($all), -$lines);
    }

    private function matchesContext(string $line, array $context): bool
    {
        foreach ($context as $key => $value) {
            // Numbers are unquoted in the JSON context, strings are quoted; the closing , or } keeps 5 from matching 55.
            if (! preg_match('/"'.preg_quote($key, '/').'":"?'.preg_quote(trim($value), '/').'"?[,}]/', $line)) {
                return false;
            }
        }

        return true;
    }
}
