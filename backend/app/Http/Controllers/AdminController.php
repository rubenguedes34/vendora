<?php

namespace App\Http\Controllers;

use App\Http\Concerns\AuthorizesWithJsonDenial;
use App\Http\Requests\Admin\BudgetsMetricsRequest;
use App\Http\Requests\Admin\InvestmentsMetricsRequest;
use App\Http\Requests\Admin\ListUsersRequest;
use App\Http\Requests\Admin\TransactionsMetricsRequest;
use App\Http\Requests\Admin\UpdateUserRoleRequest;
use App\Models\Budget;
use App\Models\Investment;
use App\Models\Transaction;
use App\Models\User;
use App\Services\TokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Models\Conversation;
use Spatie\Permission\Models\Role;

class AdminController extends Controller
{
    use AuthorizesWithJsonDenial;

    /**
     * @OA\Get(
     *     path="/api/admin/dashboard-metrics",
     *     tags={"Admin"},
     *     summary="Get admin dashboard metrics",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Response(response=200, description="Dashboard metrics"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function dashboardMetrics(): JsonResponse
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

    /**
     * @OA\Get(
     *     path="/api/admin/users",
     *     tags={"Admin"},
     *     summary="List users with pagination",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *
     *     @OA\Response(response=200, description="Paginated users"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function users(ListUsersRequest $request): JsonResponse
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

    /**
     * @OA\Patch(
     *     path="/api/admin/users/{user}/role",
     *     tags={"Admin"},
     *     summary="Update a user's role",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="user", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\RequestBody(required=true,
     *
     *         @OA\JsonContent(required={"role"},
     *
     *             @OA\Property(property="role", type="string", enum={"admin","manager","premium","user"})
     *         )
     *     ),
     *
     *     @OA\Response(response=200, description="Role updated"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=422, description="Validation error")
     * )
     */
    public function updateRole(UpdateUserRoleRequest $request, User $user): JsonResponse
    {
        if ($request->role !== 'admin' && $this->isLastAdmin($user)) {
            return response()->json(['message' => 'You cannot demote the last admin.'], 422);
        }

        Role::firstOrCreate(['name' => $request->role, 'guard_name' => 'web']);
        $user->syncRoles([$request->role]);

        return response()->json([
            'message' => 'Role updated.',
            'user' => $user->fresh()->load('roles'),
        ]);
    }

    /**
     * @OA\Patch(
     *     path="/api/admin/users/{user}/blacklist",
     *     tags={"Admin"},
     *     summary="Toggle user blacklist status",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="user", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="Blacklist toggled"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function toggleBlacklist(User $user): JsonResponse
    {
        $this->authorizeOrJson('toggleBlacklist', $user);

        $user->blacklisted_at = $user->isBlacklisted() ? null : now();
        $user->save();

        if ($user->isBlacklisted()) {
            TokenService::revokeAll($user);
        }

        return response()->json([
            'message' => $user->isBlacklisted() ? 'User blacklisted.' : 'User unblacklisted.',
            'user' => $user->fresh()->load('roles'),
        ]);
    }

    /**
     * @OA\Delete(
     *     path="/api/admin/users/{user}",
     *     tags={"Admin"},
     *     summary="Delete a user",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="user", in="path", required=true, @OA\Schema(type="integer")),
     *
     *     @OA\Response(response=200, description="User deleted"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(response=422, description="Cannot delete self")
     * )
     */
    public function destroyUser(User $user): JsonResponse
    {
        $this->authorizeOrJson('delete', $user);

        if ($this->isLastAdmin($user)) {
            return response()->json(['message' => 'You cannot delete the last admin.'], 422);
        }

        Conversation::where('participant_type', Conversation::participantType($user))
            ->where('participant_id', Conversation::participantKey($user))
            ->delete();

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    private function isLastAdmin(User $user): bool
    {
        return $user->hasRole('admin') && User::role('admin')->count() <= 1;
    }

    /**
     * SQL expression formatting a date column as Y-m on the active database driver.
     */
    private function yearMonth(string $column): string
    {
        return DB::connection()->getDriverName() === 'sqlite'
            ? "strftime('%Y-%m', {$column})"
            : "DATE_FORMAT({$column}, '%Y-%m')";
    }

    /**
     * @OA\Get(
     *     path="/api/admin/budgets-metrics",
     *     tags={"Admin"},
     *     summary="Get admin budget metrics",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="year", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *
     *     @OA\Response(response=200, description="Budget metrics"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function budgetsMetrics(BudgetsMetricsRequest $request): JsonResponse
    {
        $year = $request->query('year');
        $month = $request->query('month');
        // Free-text search reaches other users' names, emails and descriptions, so it is for "manage users" only.
        $search = $request->user()->can('manage users') ? $request->query('search') : null;

        $query = Budget::query()
            ->join('categories', 'categories.id', '=', 'budgets.category_id')
            ->when($search, function ($query, $search) {
                $term = "%{$search}%";
                $query->where(function ($q) use ($term) {
                    $q->whereHas('user', function ($uq) use ($term) {
                        $uq->where('name', 'like', $term)->orWhere('email', 'like', $term);
                    })->orWhere('categories.name', 'like', $term);
                });
            })
            ->when($year, function ($query, $year) {
                $query->where('budgets.month', 'like', $year.'-%');
            })
            ->when($month, function ($query, $month) {
                $query->where('budgets.month', $month);
            });

        $summary = (clone $query)
            ->selectRaw('COALESCE(SUM(budgets.amount), 0) as total_budgeted, COUNT(*) as count')
            ->toBase()
            ->first();

        $byCategory = (clone $query)
            ->selectRaw('categories.name as category, categories.type as type, COALESCE(SUM(budgets.amount), 0) as total')
            ->groupBy('categories.name', 'categories.type')
            ->orderByDesc('total')
            ->toBase()
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

    /**
     * @OA\Get(
     *     path="/api/admin/investments-metrics",
     *     tags={"Admin"},
     *     summary="Get admin investment metrics",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="year", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="type", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *
     *     @OA\Response(response=200, description="Investment metrics"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function investmentsMetrics(InvestmentsMetricsRequest $request): JsonResponse
    {
        $year = $request->query('year');
        $type = $request->query('type');
        // Free-text search reaches other users' names, emails and descriptions, so it is for "manage users" only.
        $search = $request->user()->can('manage users') ? $request->query('search') : null;

        // Individual rows carry other users' names, emails and amounts, so they are
        // for "manage users" only; "view metrics" alone gets the aggregates.
        $canSeeRows = $request->user()->can('manage users');

        $query = Investment::query()
            ->when($canSeeRows, fn ($query) => $query->with('user:id,name,email'))
            ->when($search, function ($query, $search) use ($canSeeRows) {
                $term = "%{$search}%";
                $query->where(function ($q) use ($term, $canSeeRows) {
                    $q->where('name', 'like', $term)
                        ->when($canSeeRows, fn ($q) => $q->orWhereHas('user', function ($uq) use ($term) {
                            $uq->where('name', 'like', $term)->orWhere('email', 'like', $term);
                        }));
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
            ->selectRaw($this->yearMonth('purchase_date').' as month, COALESCE(SUM(initial_amount), 0) as total_initial, COALESCE(SUM(current_amount), 0) as total_current')
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $investments = $canSeeRows ? $query->orderByDesc('current_amount')->paginate(25) : null;

        return response()->json([
            'summary' => $summary,
            'by_type' => $byType,
            'by_month' => $byMonth,
            'investments' => $investments,
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/admin/transactions-metrics",
     *     tags={"Admin"},
     *     summary="Get admin transaction metrics",
     *     security={{"bearerAuth":{}}},
     *
     *     @OA\Parameter(name="year", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="month", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="type", in="query", required=false, @OA\Schema(type="string")),
     *     @OA\Parameter(name="search", in="query", required=false, @OA\Schema(type="string")),
     *
     *     @OA\Response(response=200, description="Transaction metrics"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function transactionsMetrics(TransactionsMetricsRequest $request): JsonResponse
    {
        $year = $request->query('year');
        $month = $request->query('month');
        $type = $request->query('type');
        // Free-text search reaches other users' names, emails and descriptions, so it is for "manage users" only.
        $search = $request->user()->can('manage users') ? $request->query('search') : null;

        $canSeeRows = $request->user()->can('manage users');

        $query = Transaction::query()
            ->when($canSeeRows, fn ($query) => $query->with('category:id,name,type,color', 'user:id,name,email'))
            ->when($search, function ($query, $search) use ($canSeeRows) {
                $term = "%{$search}%";
                $query->where(function ($q) use ($term, $canSeeRows) {
                    $q->where('description', 'like', $term)
                        ->when($canSeeRows, fn ($q) => $q->orWhereHas('user', function ($uq) use ($term) {
                            $uq->where('name', 'like', $term)->orWhere('email', 'like', $term);
                        }))
                        ->orWhereHas('category', function ($cq) use ($term) {
                            $cq->where('name', 'like', $term);
                        });
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
            ->selectRaw($this->yearMonth('transaction_date').' as month, type, COALESCE(SUM(amount), 0) as total')
            ->groupBy('month', 'type')
            ->orderBy('month')
            ->get();

        $transactions = $canSeeRows ? $query->orderByDesc('transaction_date')->paginate(25) : null;

        return response()->json([
            'summary' => $summary,
            'by_category' => $byCategory,
            'by_month' => $byMonth,
            'transactions' => $transactions,
        ]);
    }
}
