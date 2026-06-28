<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SetupController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\InvestmentController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/setup', [SetupController::class, 'store']);

// Protected routes - using custom auth middleware
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    
    // Categories
    Route::apiResource('categories', CategoryController::class);
    
    // Transactions
    Route::apiResource('transactions', TransactionController::class);
    
    // Budgets
    Route::apiResource('budgets', BudgetController::class);
    
    // Investments
    Route::apiResource('investments', InvestmentController::class);
});
