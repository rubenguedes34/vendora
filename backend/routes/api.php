<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AiChatController;
use App\Http\Controllers\AlertRuleController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\FinancialRecordController;
use App\Http\Controllers\InvestmentController;
use App\Http\Controllers\MarketDataController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\RecurrentTransactionController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SetupController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/auth/google/exchange', [AuthController::class, 'exchangeGoogleCode'])->middleware('throttle:10,1');
Route::post('/setup', [SetupController::class, 'store'])->middleware('throttle:10,1');

// Protected routes - using custom auth middleware
Route::middleware('auth.custom')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/locale', [AuthController::class, 'updateLocale']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);

    // Categories
    Route::apiResource('categories', CategoryController::class)->only(['index', 'show']);
    Route::get('/categories-by-type/{type}', [CategoryController::class, 'byType']);

    // Transactions
    Route::get('/transactions/expenses-by-category', [TransactionController::class, 'expensesByCategory']);
    Route::get('/transactions/export', [TransactionController::class, 'export']);
    Route::get('/transactions/{id}/attachment', [TransactionController::class, 'serveAttachment']);
    Route::delete('/transactions/{id}/attachment', [TransactionController::class, 'deleteAttachment']);
    Route::apiResource('transactions', TransactionController::class);

    // Budgets - custom routes first
    Route::post('/budgets/copy-previous', [BudgetController::class, 'copyPrevious']);
    Route::get('/budgets/summary/{month?}', [BudgetController::class, 'summary']);
    Route::get('/budgets/comparison/{month?}', [BudgetController::class, 'comparison']);
    Route::apiResource('budgets', BudgetController::class);

    // Financial records (monthly income/expense/savings) - custom routes first
    Route::get('/financial-records/current', [FinancialRecordController::class, 'current']);
    Route::get('/financial-records/available', [FinancialRecordController::class, 'available']);
    Route::get('/financial-records/daily-balance', [FinancialRecordController::class, 'dailyBalance']);
    Route::get('/financial-records/month-comparison', [FinancialRecordController::class, 'monthComparison']);
    Route::get('/financial-records/year/{year}', [FinancialRecordController::class, 'byYear']);
    Route::get('/financial-records/net-worth', [FinancialRecordController::class, 'netWorth']);
    Route::get('/financial-records/allocation', [FinancialRecordController::class, 'allocation']);
    Route::get('/financial-records/health-score', [FinancialRecordController::class, 'healthScore'])->middleware('permission:view health score');
    Route::apiResource('financial-records', FinancialRecordController::class);

    // Investments
    Route::apiResource('investments', InvestmentController::class)->middleware('permission:view investments');

    // Reports
    Route::get('/reports/monthly', [ReportController::class, 'monthly'])->middleware('permission:export reports');

    // Alert rules
    Route::apiResource('alert-rules', AlertRuleController::class)->except('show');

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Market data (live price lookup, symbol search, candle chart)
    Route::middleware('throttle:market')->group(function () {
        Route::get('/market/quote', [MarketDataController::class, 'quote']);
        Route::get('/market/search', [MarketDataController::class, 'search']);
        Route::get('/market/candle', [MarketDataController::class, 'candle']);
    });

    // Tags
    Route::apiResource('tags', TagController::class)->except(['show']);

    // Recurrent transactions
    Route::post('/recurrent-transactions/copy', [RecurrentTransactionController::class, 'copyToMonth']);
    Route::apiResource('recurrent-transactions', RecurrentTransactionController::class);

    // AI support routes
    Route::middleware('permission:use ai support')->group(function () {
        Route::post('/ai/chat', [AiChatController::class, 'chat'])->middleware('throttle:ai');
        Route::get('/ai/faqs', [AiChatController::class, 'faqs']);
        Route::get('/ai/conversations', [AiChatController::class, 'conversations']);
        Route::get('/ai/conversations/{id}', [AiChatController::class, 'conversation'])->whereUuid('id');
        Route::delete('/ai/conversations/{id}', [AiChatController::class, 'deleteConversation'])->whereUuid('id');
    });

    // Admin routes
    Route::middleware('permission:access admin panel')->prefix('admin')->group(function () {
        Route::post('/panel-link', [AuthController::class, 'adminPanelLink'])->middleware('throttle:10,1');

        Route::middleware('permission:view metrics')->group(function () {
            Route::get('/dashboard-metrics', [AdminController::class, 'dashboardMetrics']);
            Route::get('/budgets-metrics', [AdminController::class, 'budgetsMetrics']);
            Route::get('/investments-metrics', [AdminController::class, 'investmentsMetrics']);
            Route::get('/transactions-metrics', [AdminController::class, 'transactionsMetrics']);
        });

        Route::middleware('permission:manage users')->group(function () {
            Route::get('/users', [AdminController::class, 'users']);
            Route::patch('/users/{user}/role', [AdminController::class, 'updateRole']);
            Route::patch('/users/{user}/blacklist', [AdminController::class, 'toggleBlacklist']);
            Route::delete('/users/{user}', [AdminController::class, 'destroyUser']);
        });
    });
});
