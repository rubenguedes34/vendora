import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, Category, BudgetSummary, BudgetComparison } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { TransactionsComponent } from '../transactions/transactions.component';
import { RecurrentTransactionsComponent } from '../recurrent-transactions/recurrent-transactions.component';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, CurrencySymbolPipe, TransactionsComponent, RecurrentTransactionsComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto pt-14 lg:pt-0 pb-20 lg:pb-0">
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <h2 class="text-xl font-semibold">Budget</h2>
            </div>
          </div>
        </header>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div class="flex gap-2 sm:gap-6 border-b border-gray-200 mb-8">
          <button (click)="activeTab = 'setup'"
            class="group relative px-3 sm:px-5 py-3.5 text-sm font-medium tracking-wide transition-colors"
            [class.text-gray-900]="activeTab === 'setup'"
            [class.text-gray-400]="activeTab !== 'setup'">
            <span class="relative z-10">Setup</span>
            <span class="absolute left-0 bottom-0 h-[2px] rounded-full bg-gray-900 transition-all duration-300 ease-out"
              [class.w-full]="activeTab === 'setup'"
              [class.w-0]="activeTab !== 'setup'"
              [class.group-hover:w-full]="activeTab !== 'setup'"></span>
          </button>
          <button (click)="activeTab = 'transactions'"
            class="group relative px-3 sm:px-5 py-3.5 text-sm font-medium tracking-wide transition-colors"
            [class.text-gray-900]="activeTab === 'transactions'"
            [class.text-gray-400]="activeTab !== 'transactions'">
            <span class="relative z-10">Transactions</span>
            <span class="absolute left-0 bottom-0 h-[2px] rounded-full bg-gray-900 transition-all duration-300 ease-out"
              [class.w-full]="activeTab === 'transactions'"
              [class.w-0]="activeTab !== 'transactions'"
              [class.group-hover:w-full]="activeTab !== 'transactions'"></span>
          </button>
          <button (click)="activeTab = 'recurrent'"
            class="group relative px-3 sm:px-5 py-3.5 text-sm font-medium tracking-wide transition-colors"
            [class.text-gray-900]="activeTab === 'recurrent'"
            [class.text-gray-400]="activeTab !== 'recurrent'">
            <span class="relative z-10">Recurrent</span>
            <span class="absolute left-0 bottom-0 h-[2px] rounded-full bg-gray-900 transition-all duration-300 ease-out"
              [class.w-full]="activeTab === 'recurrent'"
              [class.w-0]="activeTab !== 'recurrent'"
              [class.group-hover:w-full]="activeTab !== 'recurrent'"></span>
          </button>
        </div>
      </div>

      <ng-container *ngIf="activeTab === 'setup'">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <p class="text-gray-600 mb-6">Set your monthly budget for each category</p>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 class="text-xs sm:text-base font-semibold text-gray-500 sm:text-gray-700 uppercase tracking-wide mb-1 sm:mb-2">Total Income</h3>
            <p class="text-xl sm:text-3xl font-bold text-blue-600">{{ summary.income | currencySymbol }}</p>
          </div>
          <div class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 class="text-xs sm:text-base font-semibold text-gray-500 sm:text-gray-700 uppercase tracking-wide mb-1 sm:mb-2">Total Expenses</h3>
            <p class="text-xl sm:text-3xl font-bold text-red-600">{{ summary.expenses | currencySymbol }}</p>
          </div>
          <div class="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 class="text-xs sm:text-base font-semibold text-gray-500 sm:text-gray-700 uppercase tracking-wide mb-1 sm:mb-2">Total Savings</h3>
            <p class="text-xl sm:text-3xl font-bold text-green-600">{{ summary.savings | currencySymbol }}</p>
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
              <div *ngIf="incomeCategories.length === 0" class="text-gray-400 text-center py-6 text-sm">No income categories yet.</div>
              <div *ngFor="let category of incomeCategories" class="mb-3">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <img *ngIf="isImageIcon(category.icon); else incomeIcon" [src]="category.icon" [alt]="category.name" class="w-5 h-5 object-contain" />
                    <ng-template #incomeIcon><span class="text-lg leading-none">{{ category.icon || '💰' }}</span></ng-template>
                    <span class="w-2 h-2 rounded-full shrink-0" [style.background]="category.color || '#10B981'"></span>
                    <span class="font-medium text-gray-800">{{ category.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input type="number" [(ngModel)]="categoryBudgets[category.id]" (change)="saveBudget(category)"
                      class="w-28 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      placeholder="0.00" min="0" step="0.01" />
                    <span class="text-gray-500 text-sm">{{ currencyService.symbol }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Expenses Section -->
            <div *ngIf="activeSection === 'expenses'">
              <div *ngIf="expenseCategories.length === 0" class="text-gray-400 text-center py-6 text-sm">No expense categories yet.</div>
              <div *ngFor="let category of expenseCategories" class="mb-3">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <img *ngIf="isImageIcon(category.icon); else expenseIcon" [src]="category.icon" [alt]="category.name" class="w-5 h-5 object-contain" />
                    <ng-template #expenseIcon><span class="text-lg leading-none">{{ category.icon || '📦' }}</span></ng-template>
                    <span class="w-2 h-2 rounded-full shrink-0" [style.background]="category.color || '#EF4444'"></span>
                    <span class="font-medium text-gray-800">{{ category.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input type="number" [(ngModel)]="categoryBudgets[category.id]" (change)="saveBudget(category)"
                      class="w-28 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      placeholder="0.00" min="0" step="0.01" />
                    <span class="text-gray-500 text-sm">{{ currencyService.symbol }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Section -->
            <div *ngIf="activeSection === 'savings'">
              <div class="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 class="font-semibold text-gray-800 mb-2">Savings Goal</h4>
                <div class="flex items-center space-x-2">
                  <input type="number" [(ngModel)]="savingsGoalValue" (change)="updateSavingsGoal()"
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 500 or 10" min="0" step="0.01" />
                  <select [(ngModel)]="savingsGoalType" (change)="updateSavingsGoal()"
                    class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="fixed">{{ currencyService.symbol }}</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
                <p class="text-gray-600 text-sm mt-2">Target savings: {{ calculateSavingsGoalAmount() | currencySymbol }}</p>
              </div>
              <div *ngIf="savingsCategories.length === 0" class="text-gray-400 text-center py-6 text-sm">No savings categories yet.</div>
              <div *ngFor="let category of savingsCategories" class="mb-3">
                <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <img *ngIf="isImageIcon(category.icon); else savingsIcon" [src]="category.icon" [alt]="category.name" class="w-5 h-5 object-contain" />
                    <ng-template #savingsIcon><span class="text-lg leading-none">{{ category.icon || '🏦' }}</span></ng-template>
                    <span class="w-2 h-2 rounded-full shrink-0" [style.background]="category.color || '#10B981'"></span>
                    <span class="font-medium text-gray-800">{{ category.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <input type="number" [(ngModel)]="categoryBudgets[category.id]" (change)="saveBudget(category)"
                      class="w-28 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                      placeholder="0.00" min="0" step="0.01" />
                    <span class="text-gray-500 text-sm">{{ currencyService.symbol }}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- Budget vs Actual Comparison -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 class="text-base font-semibold text-gray-800">Budget vs Actual</h3>
              <p class="text-xs text-gray-400">How your spending compares to planned budgets this month</p>
            </div>
            <button (click)="loadComparison()" class="text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors">Refresh</button>
          </div>

          <div *ngIf="comparisonLoading" class="text-center py-8">
            <div class="inline-block w-6 h-6 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-2"></div>
            <p class="text-gray-400 text-sm">Loading comparison...</p>
          </div>

          <div *ngIf="!comparisonLoading && comparisonError" class="text-center py-8">
            <p class="text-red-500 text-sm mb-2">{{ comparisonError }}</p>
            <button (click)="loadComparison()" class="text-xs bg-primary-500 text-white px-3 py-1.5 rounded hover:bg-primary-600 transition-colors">Retry</button>
          </div>

          <div *ngIf="!comparisonLoading && !comparisonError && comparison.length === 0" class="text-center py-8 text-gray-400 text-sm">
            No budgets set for this month yet.
          </div>

          <div *ngIf="!comparisonLoading && comparison.length > 0" class="divide-y divide-gray-50">
            <div *ngFor="let item of comparison" class="px-6 py-4">
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="item.category_color"></span>
                  <span class="font-medium text-gray-800 text-sm truncate">{{ item.category_name }}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    [class]="item.category_type === 'income' ? 'bg-blue-50 text-blue-600' : item.category_type === 'savings' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
                    {{ item.category_type }}
                  </span>
                </div>
                <div class="flex items-center gap-4 shrink-0 text-sm">
                  <span class="text-gray-400">Budget: <span class="font-medium text-gray-700">{{ item.budgeted | currencySymbol }}</span></span>
                  <span [class]="item.pct !== null && item.pct > 100 ? 'text-red-600 font-semibold' : item.pct !== null && item.pct >= 80 ? 'text-yellow-600 font-semibold' : 'text-green-600 font-semibold'">
                    {{ item.actual | currencySymbol }}
                  </span>
                  <span class="w-10 text-right text-xs font-bold"
                    [class]="item.pct !== null && item.pct > 100 ? 'text-red-500' : item.pct !== null && item.pct >= 80 ? 'text-yellow-500' : 'text-green-500'">
                    {{ item.pct !== null ? item.pct + '%' : '—' }}
                  </span>
                </div>
              </div>
              <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-500"
                  [style.width]="clampPct(item.pct) + '%'"
                  [style.background]="item.pct !== null && item.pct > 100 ? '#ef4444' : item.pct !== null && item.pct >= 80 ? '#f59e0b' : item.category_color">
                </div>
              </div>
              <div class="mt-1 text-xs" [class]="item.remaining >= 0 ? 'text-gray-400' : 'text-red-500'">
                {{ item.remaining >= 0 ? (item.remaining | currencySymbol) + ' remaining' : ((-item.remaining) | currencySymbol) + ' over budget' }}
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
            class="px-6 py-3 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:bg-gray-400 transition-colors"
          >
            {{ isSaving ? 'Saving...' : 'Save' }}
          </button>
        </div>

        <div *ngIf="errorMessage" class="mt-4 text-red-500 text-center">
          {{ errorMessage }}
        </div>
      </div>
      </ng-container>

      <ng-container *ngIf="activeTab === 'transactions'">
        <app-transactions [embedded]="true"></app-transactions>
      </ng-container>

      <ng-container *ngIf="activeTab === 'recurrent'">
        <app-recurrent-transactions [embedded]="true"></app-recurrent-transactions>
      </ng-container>
      </main>
    </div>
  `
})
export class BudgetComponent implements OnInit {
  Math = Math;
  user: any = null;
  activeTab: 'setup' | 'transactions' | 'recurrent' = 'setup';
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

  comparison: BudgetComparison[] = [];
  comparisonLoading = false;
  comparisonError = '';

  constructor(
    private authService: AuthService,
    private financialService: FinancialService,
    private router: Router,
    public currencyService: CurrencyService
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
    this.loadComparison();
  }

  loadCategories(): void {
    this.financialService.getAllCategories().subscribe({
      next: (categories) => {
        this.incomeCategories  = categories.filter(c => c.type === 'income');
        this.expenseCategories = categories.filter(c => c.type === 'expense');
        this.savingsCategories = categories.filter(c => c.type === 'savings');
        categories.forEach(c => this.categoryBudgets[c.id] = c.budgets?.[0]?.amount || 0);
      },
      error: (error) => this.errorMessage = error.message || 'Failed to load categories',
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

  isImageIcon(icon?: string): boolean {
    return Boolean(icon?.startsWith('http://') || icon?.startsWith('https://'));
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

  loadComparison(): void {
    this.comparisonLoading = true;
    this.comparisonError = '';
    this.financialService.getBudgetComparison().subscribe({
      next: (data) => { this.comparison = data; this.comparisonLoading = false; },
      error: (err: any) => {
        this.comparison = [];
        this.comparisonLoading = false;
        this.comparisonError = err?.message || 'Failed to load. Is the backend running?';
      },
    });
  }

  clampPct(pct: number | null): number {
    if (pct === null) return 0;
    return Math.min(pct, 100);
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
