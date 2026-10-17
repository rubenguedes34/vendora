<?php

namespace App\Http\Controllers;

use App\Http\Requests\Report\MonthlyReportRequest;
use App\Services\AvailabilityCalculator;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/reports/monthly",
     *     tags={"Reports"},
     *     summary="Monthly report as a PDF: totals, comparison with the previous month, expenses by category and transactions",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string", example="2026-10")),
     *     @OA\Parameter(name="symbol", in="query", required=false, @OA\Schema(type="string", example="€")),
     *
     *     @OA\Response(response=200, description="PDF file", @OA\MediaType(mediaType="application/pdf"))
     * )
     */
    public function monthly(MonthlyReportRequest $request, AvailabilityCalculator $calculator)
    {
        $user = $request->user();
        [$year, $month] = $request->period();
        $start = Carbon::create($year, $month, 1);

        $transactions = $user->transactions()
            ->with('category')
            ->whereDate('transaction_date', '>=', $start->toDateString())
            ->whereDate('transaction_date', '<=', $start->copy()->endOfMonth()->toDateString())
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();

        $byCategory = $transactions->where('type', 'expense')
            ->groupBy(fn ($t) => $t->category?->name ?? 'Uncategorised')
            ->map(fn ($group) => $group->sum('amount'))
            ->sortDesc();

        return Pdf::loadView('reports.monthly', [
            'user' => $user,
            'monthLabel' => $start->format('F Y'),
            'symbol' => $request->input('symbol', '€'),
            'comparison' => $calculator->comparison($user, $year, $month),
            'byCategory' => $byCategory,
            'transactions' => $transactions,
        ])->download('vendora-'.$start->format('Y-m').'.pdf');
    }
}
