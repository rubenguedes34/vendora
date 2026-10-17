import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CategoryNamePipe } from '../../pipes/category-name.pipe';
import { AuthService } from '../../services/auth.service';
import {
  FinancialService,
  Category,
  BudgetSummary,
  BudgetComparison,
} from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { TransactionsComponent } from '../transactions/transactions.component';
import { RecurrentTransactionsComponent } from '../recurrent-transactions/recurrent-transactions.component';
import { User } from '../../services/auth.service';
import { ApiError } from '../../models/api';

@Component({
  selector: 'app-budget',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SidebarComponent,
    CurrencySymbolPipe,
    TranslatePipe,
    CategoryNamePipe,
    TransactionsComponent,
    RecurrentTransactionsComponent,
  ],
  templateUrl: './budget.component.html',
})
export class BudgetComponent implements OnInit {
  Math = Math;
  user: User | null = null;
  activeTab: 'setup' | 'transactions' | 'recurrent' = 'setup';
  activeSection: 'income' | 'expenses' | 'savings' = 'income';

  sections: { key: 'income' | 'expenses' | 'savings' }[] = [
    { key: 'income' },
    { key: 'expenses' },
    { key: 'savings' },
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
    public currencyService: CurrencyService,
    private translate: TranslateService,
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
        this.incomeCategories = categories.filter((c) => c.type === 'income');
        this.expenseCategories = categories.filter((c) => c.type === 'expense');
        this.savingsCategories = categories.filter((c) => c.type === 'savings');
        categories.forEach((c) => (this.categoryBudgets[c.id] = c.budgets?.[0]?.amount || 0));
      },
      error: (error) =>
        (this.errorMessage =
          error.message || this.translate.instant('budget.errors.loadCategories')),
    });
  }

  loadSummary(): void {
    this.financialService.getBudgetSummary().subscribe({
      next: (summary) => (this.summary = summary),
      error: (error) =>
        (this.errorMessage = error.message || this.translate.instant('budget.errors.loadSummary')),
    });
  }

  loadSavingsGoal(): void {
    this.savingsGoalValue = this.user?.savings_goal || 0;
    this.savingsGoalType = this.user?.savings_goal_type || 'fixed';
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
      error: (error) =>
        (this.errorMessage = error.message || this.translate.instant('budget.errors.saveBudget')),
    });
  }

  updateSavingsGoal(): void {
    const currentMonth = this.getCurrentMonth();
    const [year, month] = currentMonth.split('-').map(Number);

    this.financialService
      .saveRecord({
        year,
        month,
        monthly_income: this.summary.income,
        monthly_expenses: this.summary.expenses,
        savings_goal: this.savingsGoalValue,
        savings_goal_type: this.savingsGoalType,
      })
      .subscribe({
        next: () => {
          if (!this.user) return;
          this.user.savings_goal = this.savingsGoalValue;
          this.user.savings_goal_type = this.savingsGoalType;
          this.authService.setUser(this.user);
        },
        error: (error) =>
          (this.errorMessage = error.message || this.translate.instant('budget.errors.updateGoal')),
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

    categories.forEach((category) => {
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
      next: (data) => {
        this.comparison = data;
        this.comparisonLoading = false;
      },
      error: (err: ApiError) => {
        this.comparison = [];
        this.comparisonLoading = false;
        this.comparisonError =
          err?.message || this.translate.instant('budget.errors.loadComparison');
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
      },
    });
  }
}
