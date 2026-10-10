<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('financial_records', function (Blueprint $table) {
            $table->boolean('is_custom')->default(false)->after('monthly_expenses');
            $table->decimal('base_income', 10, 2)->default(0)->after('is_custom');
            $table->decimal('base_expenses', 10, 2)->default(0)->after('base_income');
        });

        // Every month now follows the user's default plus its transactions, so re-derive the stored totals.
        DB::table('financial_records')
            ->join('users', 'users.id', '=', 'financial_records.user_id')
            ->select('financial_records.id', 'financial_records.user_id', 'financial_records.year', 'financial_records.month', 'users.monthly_income as default_income', 'users.monthly_expenses as default_expenses')
            ->orderBy('financial_records.id')
            ->each(function ($record): void {
                $start = sprintf('%04d-%02d-01', $record->year, $record->month);
                $end = date('Y-m-t', strtotime($start));

                $sums = DB::table('transactions')
                    ->where('user_id', $record->user_id)
                    ->whereBetween('transaction_date', [$start, $end])
                    ->selectRaw('type, SUM(amount) as total')
                    ->groupBy('type')
                    ->pluck('total', 'type');

                DB::table('financial_records')->where('id', $record->id)->update([
                    'monthly_income' => (float) $record->default_income + (float) ($sums['income'] ?? 0),
                    'monthly_expenses' => (float) $record->default_expenses + (float) ($sums['expense'] ?? 0),
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('financial_records', function (Blueprint $table) {
            $table->dropColumn(['is_custom', 'base_income', 'base_expenses']);
        });
    }
};
