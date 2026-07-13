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

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/setup', [SetupController::class, 'store']);

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
    Route::apiResource('transactions', TransactionController::class);

    // Budgets - custom routes first
    Route::get('/budgets/summary/{month?}', [BudgetController::class, 'summary']);
    Route::get('/budgets/comparison/{month?}', [BudgetController::class, 'comparison']);
    Route::apiResource('budgets', BudgetController::class);

    // Financial records (monthly income/expense/savings) - custom routes first
    Route::get('/financial-records/current', [FinancialRecordController::class, 'current']);
    Route::get('/financial-records/year/{year}', [FinancialRecordController::class, 'byYear']);
    Route::get('/financial-records/net-worth', [FinancialRecordController::class, 'netWorth']);
    Route::apiResource('financial-records', FinancialRecordController::class);

    // Investments
    Route::apiResource('investments', InvestmentController::class);

    // Market data (live price lookup)
    Route::get('/market/quote', [MarketDataController::class, 'quote']);

    // Recurrent transactions
    Route::post('/recurrent-transactions/copy', [RecurrentTransactionController::class, 'copyToMonth']);
    Route::apiResource('recurrent-transactions', RecurrentTransactionController::class);
});
