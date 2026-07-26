<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SetupController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\FinancialRecordController;
use App\Http\Controllers\InvestmentController;
use App\Http\Controllers\MarketDataController;
use App\Http\Controllers\RecurrentTransactionController;
use App\Http\Controllers\TagController;
use App\Http\Controllers\WatchlistController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\AiChatController;

// Public routes
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/setup', [SetupController::class, 'store'])->middleware('throttle:10,1');

// Protected routes - using custom auth middleware
Route::middleware('auth.custom')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);

    // Categories
    Route::apiResource('categories', CategoryController::class);
    Route::get('/categories-by-type/{type}', [CategoryController::class, 'byType']);

    // Transactions
    Route::get('/transactions/expenses-by-category', [TransactionController::class, 'expensesByCategory']);
    Route::get('/transactions/export', [TransactionController::class, 'export']);
    Route::get('/transactions/{id}/attachment', [TransactionController::class, 'serveAttachment']);
    Route::delete('/transactions/{id}/attachment', [TransactionController::class, 'deleteAttachment']);
    Route::apiResource('transactions', TransactionController::class);

    // Budgets - custom routes first
    Route::get('/budgets/summary/{month?}', [BudgetController::class, 'summary']);
    Route::get('/budgets/comparison/{month?}', [BudgetController::class, 'comparison']);
    Route::apiResource('budgets', BudgetController::class);

    // Financial records (monthly income/expense/savings) - custom routes first
    Route::get('/financial-records/current', [FinancialRecordController::class, 'current']);
    Route::get('/financial-records/year/{year}', [FinancialRecordController::class, 'byYear']);
    Route::get('/financial-records/net-worth', [FinancialRecordController::class, 'netWorth']);
    Route::get('/financial-records/allocation', [FinancialRecordController::class, 'allocation']);
    Route::get('/financial-records/health-score', [FinancialRecordController::class, 'healthScore']);
    Route::apiResource('financial-records', FinancialRecordController::class);

    // Investments
    Route::apiResource('investments', InvestmentController::class);

    // Watchlist
    Route::apiResource('watchlist', WatchlistController::class)->except(['show', 'update']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    // Market data (live price lookup, symbol search, candle chart)
    Route::get('/market/quote',  [MarketDataController::class, 'quote']);
    Route::get('/market/search', [MarketDataController::class, 'search']);
    Route::get('/market/candle', [MarketDataController::class, 'candle']);

    // Tags
    Route::apiResource('tags', TagController::class)->except(['show']);

    // Recurrent transactions
    Route::post('/recurrent-transactions/copy', [RecurrentTransactionController::class, 'copyToMonth']);
    Route::apiResource('recurrent-transactions', RecurrentTransactionController::class);

    // AI support routes
    Route::post('/ai/chat', [AiChatController::class, 'chat']);
    Route::get('/ai/faqs', [AiChatController::class, 'faqs']);

    // Admin routes
    Route::middleware('permission:access admin panel')->prefix('admin')->group(function () {
        Route::get('/dashboard-metrics', [AdminController::class, 'dashboardMetrics']);
        Route::get('/users', [AdminController::class, 'users']);
        Route::patch('/users/{user}/role', [AdminController::class, 'updateRole']);
        Route::patch('/users/{user}/blacklist', [AdminController::class, 'toggleBlacklist']);
        Route::delete('/users/{user}', [AdminController::class, 'destroyUser']);
        Route::get('/budgets-metrics', [AdminController::class, 'budgetsMetrics']);
        Route::get('/investments-metrics', [AdminController::class, 'investmentsMetrics']);
        Route::get('/transactions-metrics', [AdminController::class, 'transactionsMetrics']);
    });
});
