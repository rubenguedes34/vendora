<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Investment;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class AdminController extends Controller
{
    public function dashboardMetrics(): \Illuminate\Http\JsonResponse
    {
        $usersQuery = User::query();
        $activeUsers = (clone $usersQuery)->whereNull('blacklisted_at')->count();
        $blacklistedUsers = (clone $usersQuery)->whereNotNull('blacklisted_at')->count();
        $newUsersThisMonth = (clone $usersQuery)->whereYear('created_at', now()->year)
            ->whereMonth('created_at', now()->month)
            ->count();

        $transactionsCount = Transaction::count();
        $incomeTotal = (float) Transaction::where('type', 'income')->sum('amount');
        $expenseTotal = (float) Transaction::where('type', 'expense')->sum('amount');

        $budgetsTotal = (float) Budget::sum('amount');
        $investmentsInitial = (float) Investment::sum('initial_amount');
        $investmentsCurrent = (float) Investment::sum('current_amount');

        return response()->json([
            'total_users' => $usersQuery->count(),
            'active_users' => $activeUsers,
            'blacklisted_users' => $blacklistedUsers,
            'new_users_this_month' => $newUsersThisMonth,
            'total_transactions' => $transactionsCount,
            'total_income' => $incomeTotal,
            'total_expenses' => $expenseTotal,
            'total_budgeted' => $budgetsTotal,
            'total_invested_initial' => $investmentsInitial,
            'total_invested_current' => $investmentsCurrent,
        ]);
    }

    public function users(Request $request): \Illuminate\Http\JsonResponse
    {
        $search = $request->query('search');

        $users = User::query()
            ->when($search, function ($query, $search) {
                $term = "%{$search}%";
                $query->where(function ($q) use ($term) {
                    $q->where('name', 'like', $term)
                        ->orWhere('email', 'like', $term);
                });
            })
            ->with('roles')
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($users);
    }

    public function updateRole(Request $request, User $user): \Illuminate\Http\JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot change your own role.'], 422);
        }

        $request->validate([
            'role' => 'required|string|in:admin,manager,user',
        ]);

        Role::firstOrCreate(['name' => $request->role, 'guard_name' => 'web']);
        $user->syncRoles([$request->role]);

        return response()->json([
            'message' => 'Role updated.',
            'user' => $user->fresh()->load('roles'),
        ]);
    }

    public function toggleBlacklist(Request $request, User $user): \Illuminate\Http\JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot blacklist yourself.'], 422);
        }

        $user->blacklisted_at = $user->isBlacklisted() ? null : now();
        $user->save();

        return response()->json([
            'message' => $user->isBlacklisted() ? 'User blacklisted.' : 'User unblacklisted.',
            'user' => $user->fresh()->load('roles'),
        ]);
    }

    public function destroyUser(Request $request, User $user): \Illuminate\Http\JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    public function budgetsMetrics(Request $request): \Illuminate\Http\JsonResponse
    {
        $year = $request->query('year');
        $month = $request->query('month');
        $search = $request->query('search');

        $query = Budget::query()
            ->selectRaw('budgets.*, categories.name as category_name, categories.type as category_type')
            ->join('categories', 'categories.id', '=', 'budgets.category_id')
            ->when($search, function ($query, $search) {
                $term = "%{$search}%";
                $query->whereHas('user', function ($q) use ($term) {
                    $q->where('name', 'like', $term)->orWhere('email', 'like', $term);
                })->orWhere('categories.name', 'like', $term);
            })
            ->when($year, function ($query, $year) {
                $query->whereRaw("SUBSTRING(month, 1, 4) = ?", [$year]);
            })
            ->when($month, function ($query, $month) {
                $query->where('month', $month);
            });

        $summary = (clone $query)
            ->selectRaw('COALESCE(SUM(amount), 0) as total_budgeted, COUNT(*) as count')
            ->first();

        $byCategory = (clone $query)
            ->selectRaw('categories.name as category, categories.type as type, COALESCE(SUM(amount), 0) as total')
            ->groupBy('categories.name', 'categories.type')
            ->orderByDesc('total')
            ->get();

        $byMonth = Budget::query()
            ->selectRaw('month, COALESCE(SUM(amount), 0) as total')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json([
            'summary' => $summary,
            'by_category' => $byCategory,
            'by_month' => $byMonth,
        ]);
    }

    public function investmentsMetrics(Request $request): \Illuminate\Http\JsonResponse
    {
        $year = $request->query('year');
        $type = $request->query('type');
        $search = $request->query('search');

        $query = Investment::query()
            ->with('user:id,name,email')
            ->when($search, function ($query, $search) {
                $term = "%{$search}%";
                $query->where('name', 'like', $term)
                    ->orWhereHas('user', function ($q) use ($term) {
                        $q->where('name', 'like', $term)->orWhere('email', 'like', $term);
                    });
            })
            ->when($year, function ($query, $year) {
                $query->whereYear('purchase_date', $year);
            })
            ->when($type, function ($query, $type) {
                $query->where('type', $type);
            });

        $summary = (clone $query)
            ->selectRaw('COALESCE(SUM(initial_amount), 0) as total_initial, COALESCE(SUM(current_amount), 0) as total_current, COUNT(*) as count')
            ->first();

        $byType = (clone $query)
            ->selectRaw('type, COALESCE(SUM(initial_amount), 0) as total_initial, COALESCE(SUM(current_amount), 0) as total_current, COUNT(*) as count')
            ->groupBy('type')
            ->get();

        $byMonth = Investment::query()
            ->selectRaw("DATE_FORMAT(purchase_date, '%Y-%m') as month, COALESCE(SUM(initial_amount), 0) as total_initial, COALESCE(SUM(current_amount), 0) as total_current")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $investments = $query->orderByDesc('current_amount')->paginate(25);

        return response()->json([
            'summary' => $summary,
            'by_type' => $byType,
            'by_month' => $byMonth,
            'investments' => $investments,
        ]);
    }

    public function transactionsMetrics(Request $request): \Illuminate\Http\JsonResponse
    {
        $year = $request->query('year');
        $month = $request->query('month');
        $type = $request->query('type');
        $search = $request->query('search');

        $query = Transaction::query()
            ->with('category:id,name,type,color', 'user:id,name,email')
            ->when($search, function ($query, $search) {
                $term = "%{$search}%";
                $query->where('description', 'like', $term)
                    ->orWhereHas('user', function ($q) use ($term) {
                        $q->where('name', 'like', $term)->orWhere('email', 'like', $term);
                    })
                    ->orWhereHas('category', function ($q) use ($term) {
                        $q->where('name', 'like', $term);
                    });
            })
            ->when($year, function ($query, $year) {
                $query->whereYear('transaction_date', $year);
            })
            ->when($month, function ($query, $month) {
                $query->whereMonth('transaction_date', $month);
            })
            ->when($type, function ($query, $type) {
                $query->where('type', $type);
            });

        $summary = (clone $query)
            ->selectRaw('type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count')
            ->groupBy('type')
            ->get();

        $byCategory = (clone $query)
            ->selectRaw('category_id, COALESCE(SUM(amount), 0) as total, COUNT(*) as count')
            ->groupBy('category_id')
            ->with('category:id,name,type,color')
            ->get()
            ->map(function ($row) {
                return [
                    'category_id' => $row->category_id,
                    'category' => $row->category?->name ?? 'Uncategorized',
                    'type' => $row->category?->type,
                    'color' => $row->category?->color,
                    'total' => (float) $row->total,
                    'count' => $row->count,
                ];
            });

        $byMonth = Transaction::query()
            ->selectRaw("DATE_FORMAT(transaction_date, '%Y-%m') as month, type, COALESCE(SUM(amount), 0) as total")
            ->groupBy('month', 'type')
            ->orderBy('month')
            ->get();

        $transactions = $query->orderByDesc('transaction_date')->paginate(25);

        return response()->json([
            'summary' => $summary,
            'by_category' => $byCategory,
            'by_month' => $byMonth,
            'transactions' => $transactions,
        ]);
    }
}
