import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, Category, BudgetSummary } from '../../services/financial.service';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-gray-100">
      <!-- Header -->
      <nav class="bg-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16 items-center">
            <div class="flex items-center space-x-4">
              <button (click)="goBack()" class="text-gray-600 hover:text-gray-900">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <h1 class="text-2xl font-bold text-gray-800">Define Budgets</h1>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-gray-700">{{ user?.name }}</span>
              <button (click)="logout()" class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p class="text-gray-600 mb-6">Set your monthly budget for each category</p>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold text-gray-700 mb-2">Total Income</h3>
            <p class="text-3xl font-bold text-blue-600">€{{ formatCurrency(summary.income) }}</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold text-gray-700 mb-2">Total Expenses</h3>
            <p class="text-3xl font-bold text-red-600">€{{ formatCurrency(summary.expenses) }}</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold text-gray-700 mb-2">Total Savings</h3>
            <p class="text-3xl font-bold text-green-600">€{{ formatCurrency(summary.savings) }}</p>
          </div>
        </div>

        <!-- Section Tabs -->
        <div class="bg-white rounded-lg shadow-md mb-6">
          <div class="flex border-b">
            <button
              *ngFor="let section of sections"
              (click)="activeSection = section.key"
              [class]="activeSection === section.key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'"
              class="flex-1 py-4 px-6 font-semibold transition-colors"
            >
              {{ section.label }}
            </button>
          </div>

          <div class="p-6">
            <!-- Income Section -->
            <div *ngIf="activeSection === 'income'">
              <div *ngIf="incomeCategories.length === 0" class="text-gray-500 text-center py-8">
                No income categories. Add one to get started.
              </div>
              <div *ngFor="let category of incomeCategories" class="mb-4">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <span class="text-2xl">{{ category.icon || '💰' }}</span>
                    <span class="font-semibold text-gray-800">{{ category.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input
                      type="number"
                      [(ngModel)]="categoryBudgets[category.id]"
                      (change)="saveBudget(category)"
                      class="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <span class="text-gray-600">€</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Expenses Section -->
            <div *ngIf="activeSection === 'expenses'">
              <div *ngIf="expenseCategories.length === 0" class="text-gray-500 text-center py-8">
                No expense categories. Add one to get started.
              </div>
              <div *ngFor="let category of expenseCategories" class="mb-4">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <span class="text-2xl">{{ category.icon || '📦' }}</span>
                    <span class="font-semibold text-gray-800">{{ category.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input
                      type="number"
                      [(ngModel)]="categoryBudgets[category.id]"
                      (change)="saveBudget(category)"
                      class="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <span class="text-gray-600">€</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Section -->
            <div *ngIf="activeSection === 'savings'">
              <div class="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">Savings Goal</h4>
                <div class="flex items-center space-x-2">
                  <input
                    type="number"
                    [(ngModel)]="savingsGoalValue"
                    (change)="updateSavingsGoal()"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 500 or 10"
                    min="0"
                    step="0.01"
                  />
                  <select
                    [(ngModel)]="savingsGoalType"
                    (change)="updateSavingsGoal()"
                    class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">€</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
                <p class="text-gray-600 text-sm mt-2">
                  Target savings: €{{ formatCurrency(calculateSavingsGoalAmount()) }}
                </p>
              </div>

              <div *ngIf="savingsCategories.length === 0" class="text-gray-500 text-center py-8">
                No savings categories. Add one to get started.
              </div>
              <div *ngFor="let category of savingsCategories" class="mb-4">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <span class="text-2xl">{{ category.icon || '🏦' }}</span>
                    <span class="font-semibold text-gray-800">{{ category.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input
                      type="number"
                      [(ngModel)]="categoryBudgets[category.id]"
                      (change)="saveBudget(category)"
                      class="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <span class="text-gray-600">€</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Save Button -->
        <div class="flex justify-end space-x-4">
          <button
            (click)="goBack()"
            class="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="saveAll()"
            [disabled]="isSaving"
            class="px-6 py-3 bg-teal-500 text-white rounded-md hover:bg-teal-600 disabled:bg-gray-400 transition-colors"
          >
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <div *ngIf="errorMessage" class="mt-4 text-red-500 text-center">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  `
})
export class BudgetComponent implements OnInit {
  user: any = null;
  activeSection: 'income' | 'expenses' | 'savings' = 'income';

  sections: { key: 'income' | 'expenses' | 'savings'; label: string }[] = [
    { key: 'income', label: 'Income' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'savings', label: 'Savings' },
  ];

  incomeCategories: Category[] = [];
  expenseCategories: Category[] = [];
  savingsCategories: Category[] = [];

  categoryBudgets: { [categoryId: number]: number } = {};
  savingsGoalValue = 0;
  savingsGoalType: 'fixed' | 'percentage' = 'fixed';

  summary: BudgetSummary = {
    month: '',
    income: 0,
    expenses: 0,
    savings: 0,
    balance: 0,
  };

  isSaving = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private financialService: FinancialService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUserValue();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadCategories();
    this.loadSummary();
    this.loadSavingsGoal();
  }

  loadCategories(): void {
    this.financialService.getCategoriesByType('income').subscribe({
      next: (categories) => {
        this.incomeCategories = categories;
        this.incomeCategories.forEach(c => this.categoryBudgets[c.id] = c.budgets?.[0]?.amount || 0);
      },
      error: (error) => this.errorMessage = error.message || 'Failed to load income categories',
    });

    this.financialService.getCategoriesByType('expense').subscribe({
      next: (categories) => {
        this.expenseCategories = categories;
        this.expenseCategories.forEach(c => this.categoryBudgets[c.id] = c.budgets?.[0]?.amount || 0);
      },
      error: (error) => this.errorMessage = error.message || 'Failed to load expense categories',
    });

    this.financialService.getCategoriesByType('savings').subscribe({
      next: (categories) => {
        this.savingsCategories = categories;
        this.savingsCategories.forEach(c => this.categoryBudgets[c.id] = c.budgets?.[0]?.amount || 0);
      },
      error: (error) => this.errorMessage = error.message || 'Failed to load savings categories',
    });
  }

  loadSummary(): void {
    this.financialService.getBudgetSummary().subscribe({
      next: (summary) => this.summary = summary,
      error: (error) => this.errorMessage = error.message || 'Failed to load summary',
    });
  }

  loadSavingsGoal(): void {
    this.savingsGoalValue = this.user.savings_goal || 0;
    this.savingsGoalType = this.user.savings_goal_type || 'fixed';
  }

  calculateSavingsGoalAmount(): number {
    if (this.savingsGoalType === 'percentage') {
      return (this.summary.income * this.savingsGoalValue) / 100;
    }
    return this.savingsGoalValue;
  }

  saveBudget(category: Category): void {
    const amount = this.categoryBudgets[category.id] || 0;
    const month = this.getCurrentMonth();

    this.financialService.saveBudget(category.id, amount, month).subscribe({
      next: () => this.loadSummary(),
      error: (error) => this.errorMessage = error.message || 'Failed to save budget',
    });
  }

  updateSavingsGoal(): void {
    const currentMonth = this.getCurrentMonth();
    const [year, month] = currentMonth.split('-').map(Number);

    this.financialService.saveRecord({
      year,
      month,
      monthly_income: this.summary.income,
      monthly_expenses: this.summary.expenses,
      savings_goal: this.savingsGoalValue,
      savings_goal_type: this.savingsGoalType,
    }).subscribe({
      next: () => {
        this.user.savings_goal = this.savingsGoalValue;
        this.user.savings_goal_type = this.savingsGoalType;
        this.authService.setUser(this.user);
      },
      error: (error) => this.errorMessage = error.message || 'Failed to update savings goal',
    });
  }

  saveAll(): void {
    this.isSaving = true;
    this.errorMessage = '';

    const categories = [
      ...this.incomeCategories,
      ...this.expenseCategories,
      ...this.savingsCategories,
    ];

    let completed = 0;
    const total = categories.length;

    if (total === 0) {
      this.isSaving = false;
      this.goBack();
      return;
    }

    categories.forEach(category => {
      this.saveBudget(category);
      completed++;
      if (completed === total) {
        this.updateSavingsGoal();
        this.isSaving = false;
        this.goBack();
      }
    });
  }

  getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  formatCurrency(value: number): string {
    return (value || 0).toFixed(2);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      }
    });
  }
}
