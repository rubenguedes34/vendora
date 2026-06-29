<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\FinancialRecordController;
use App\Http\Controllers\InvestmentController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes - using custom auth middleware
Route::middleware('auth.custom')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    // Categories
    Route::apiResource('categories', CategoryController::class);
    Route::get('/categories-by-type/{type}', [CategoryController::class, 'byType']);

    // Transactions
    Route::apiResource('transactions', TransactionController::class);

    // Budgets - custom routes first
    Route::get('/budgets/summary/{month?}', [BudgetController::class, 'summary']);
    Route::apiResource('budgets', BudgetController::class);

    // Financial records (monthly income/expense/savings) - custom routes first
    Route::get('/financial-records/current', [FinancialRecordController::class, 'current']);
    Route::get('/financial-records/year/{year}', [FinancialRecordController::class, 'byYear']);
    Route::apiResource('financial-records', FinancialRecordController::class);

    // Investments
    Route::apiResource('investments', InvestmentController::class);
});
