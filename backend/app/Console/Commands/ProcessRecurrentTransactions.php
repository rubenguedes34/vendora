<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RecurrentTransaction;
use App\Models\Transaction;
use Carbon\Carbon;

class ProcessRecurrentTransactions extends Command
{
    protected $signature   = 'recurrent:process {--month= : Target month in Y-m format (defaults to current month)}';
    protected $description = 'Auto-create transactions from active recurrent transaction rules for a given month';

    public function handle(): int
    {
        $monthParam = $this->option('month') ?? date('Y-m');

        if (!preg_match('/^\d{4}-\d{2}$/', $monthParam)) {
            $this->error("Invalid month format. Use Y-m (e.g. 2025-07).");
            return self::FAILURE;
        }

        [$year, $month] = explode('-', $monthParam);
        $year  = (int) $year;
        $month = (int) $month;

        $recurrents = RecurrentTransaction::with(['user', 'category'])
            ->where('is_active', true)
            ->get();

        $created  = 0;
        $skipped  = 0;

        foreach ($recurrents as $recurrent) {
            $day = (int) ($recurrent->day_of_month ?? 1);
            $daysInMonth = Carbon::createFromDate($year, $month, 1)->daysInMonth;
            $day = min($day, $daysInMonth);

            $transactionDate = Carbon::createFromDate($year, $month, $day)->format('Y-m-d');

            $alreadyExists = Transaction::where('user_id', $recurrent->user_id)
                ->where('category_id', $recurrent->category_id)
                ->where('amount', $recurrent->amount)
                ->where('type', $recurrent->type)
                ->whereDate('transaction_date', $transactionDate)
                ->where('description', $recurrent->description)
                ->exists();

            if ($alreadyExists) {
                $skipped++;
                continue;
            }

            Transaction::create([
                'user_id'          => $recurrent->user_id,
                'category_id'      => $recurrent->category_id,
                'description'      => $recurrent->description,
                'amount'           => $recurrent->amount,
                'type'             => $recurrent->type,
                'transaction_date' => $transactionDate,
            ]);

            $created++;
        }

        $this->info("Recurrent transactions processed for {$year}-{$month}: {$created} created, {$skipped} skipped (already existed).");
        return self::SUCCESS;
    }
}
