<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Vendora report {{ $monthLabel }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #111827; }
        h1 { font-size: 18px; margin: 0 0 2px; }
        h2 { font-size: 13px; margin: 18px 0 6px; }
        .muted { color: #6b7280; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; text-align: left; }
        th { background: #f3f4f6; font-size: 10px; text-transform: uppercase; }
        .num { text-align: right; }
    </style>
</head>
<body>
@php
    $money = fn ($v) => $symbol.number_format((float) $v, 2);
    $pct = fn ($v) => is_null($v) ? '-' : ($v > 0 ? '+' : '').$v.'%';
    $current = $comparison['current'];
@endphp
    <h1>Monthly report: {{ $monthLabel }}</h1>
    <p class="muted">{{ $user->name }}</p>

    <h2>Summary</h2>
    <table>
        <tr><th></th><th class="num">This month</th><th class="num">Previous month</th><th class="num">Change</th></tr>
        @foreach (['income' => 'Income', 'expenses' => 'Expenses', 'savings' => 'Savings'] as $key => $label)
            <tr>
                <td>{{ $label }}</td>
                <td class="num">{{ $money($current[$key]) }}</td>
                <td class="num">{{ $money($comparison['previous'][$key]) }}</td>
                <td class="num">{{ $pct($comparison['change_pct'][$key]) }}</td>
            </tr>
        @endforeach
    </table>

    <h2>Expenses by category</h2>
    <table>
        @forelse ($byCategory as $name => $total)
            <tr><td>{{ $name }}</td><td class="num">{{ $money($total) }}</td></tr>
        @empty
            <tr><td class="muted">No expense transactions this month</td></tr>
        @endforelse
    </table>

    <h2>Transactions</h2>
    <table>
        <tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th></tr>
        @forelse ($transactions as $t)
            <tr>
                <td>{{ $t->transaction_date->format('Y-m-d') }}</td>
                <td>{{ $t->description }}</td>
                <td>{{ $t->category?->name }}</td>
                <td class="num">{{ $t->type === 'income' ? '+' : '-' }}{{ $money($t->amount) }}</td>
            </tr>
        @empty
            <tr><td colspan="4" class="muted">No transactions this month</td></tr>
        @endforelse
    </table>
</body>
</html>
