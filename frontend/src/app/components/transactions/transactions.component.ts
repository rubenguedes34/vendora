import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TransactionService } from '../../services/transaction.service';
import { FinancialService, Category } from '../../services/financial.service';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SidebarComponent, CurrencySymbolPipe],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto pt-14 lg:pt-0">
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <h2 class="text-xl font-semibold">Transactions</h2>
              <div class="flex items-center gap-2">
                <button (click)="exportCsv()"
                  class="flex items-center gap-1.5 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors text-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Export CSV
                </button>
                <button
                  (click)="showForm = !showForm"
                  class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                  {{ showForm && !editingTransaction ? 'Cancel' : '+ Add Transaction' }}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <!-- Add/Edit Form -->
          <div *ngIf="showForm" class="bg-white p-6 rounded-xl shadow-md mb-6 border border-gray-100">
            <h2 class="text-lg font-semibold text-gray-800 mb-4">{{ editingTransaction ? 'Edit Transaction' : 'Add New Transaction' }}</h2>
            <form [formGroup]="transactionForm" (ngSubmit)="onSubmit()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Description</label>
                  <input type="text" formControlName="description"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter description" />
                </div>
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Amount ({{ currencyService.symbol }})</label>
                  <input type="number" step="0.01" formControlName="amount"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00" />
                </div>
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Type</label>
                  <select formControlName="type"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Date</label>
                  <input type="date" formControlName="transaction_date"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-gray-700 text-sm font-bold mb-2">Category</label>
                  <select formControlName="category_id"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select a category</option>
                    <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
              </div>
              <div *ngIf="errorMessage" class="mt-3 text-red-500 text-sm">{{ errorMessage }}</div>
              <div class="mt-4 flex space-x-3">
                <button type="submit" [disabled]="transactionForm.invalid || isSaving"
                  class="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
                  {{ isSaving ? 'Saving...' : (editingTransaction ? 'Update' : 'Add') + ' Transaction' }}
                </button>
                <button type="button" (click)="cancelEdit()"
                  class="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <!-- Filter Bar -->
          <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
            <div class="flex flex-col gap-3">
              <!-- Row 1: search + type + category -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="relative">
                  <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                  <input type="text" placeholder="Search description..."
                    [value]="filterSearch"
                    (input)="onSearchInput($event)"
                    class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select (change)="onFilterChange('type', $any($event.target).value)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
                <select (change)="onFilterChange('category_id', $any($event.target).value)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All categories</option>
                  <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <!-- Row 2: date range -->
              <div class="grid grid-cols-2 gap-3">
                <input type="date"
                  (change)="onFilterChange('date_from', $any($event.target).value)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="date"
                  (change)="onFilterChange('date_to', $any($event.target).value)"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-gray-400">{{ transactions.length }} transaction{{ transactions.length !== 1 ? 's' : '' }} found</span>
              <button *ngIf="hasActiveFilters()" (click)="clearFilters()"
                class="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors">
                Clear filters
              </button>
            </div>
          </div>

          <!-- Transactions List -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">
            <div class="p-6">
              <div *ngIf="isLoading" class="text-gray-400 text-center py-10">
                <svg class="w-8 h-8 mx-auto mb-2 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Loading...
              </div>

              <div *ngIf="!isLoading && transactions.length === 0" class="text-center py-12">
                <svg class="w-12 h-12 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
                <p class="text-gray-400 text-sm">{{ hasActiveFilters() ? 'No transactions match your filters.' : 'No transactions yet. Add your first one!' }}</p>
              </div>

              <div *ngFor="let transaction of transactions" class="flex justify-between items-center py-3.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    [style.background]="transaction.category?.color ? transaction.category.color + '22' : '#e5e7eb'">
                    <span class="text-base">{{ transaction.category?.icon || '💳' }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium text-gray-800 truncate">{{ transaction.description }}</p>
                    <p class="text-xs text-gray-400">{{ transaction.transaction_date | date:'mediumDate' }} · {{ transaction.category?.name || 'No category' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-3 ml-4 shrink-0">
                  <span [class]="transaction.type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'">
                    {{ transaction.type === 'income' ? '+' : '-' }}{{ transaction.amount | currencySymbol }}
                  </span>
                  <button (click)="editTransaction(transaction)" class="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button (click)="deleteTransaction(transaction.id)" class="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class TransactionsComponent implements OnInit {
  transactions: any[] = [];
  categories: Category[] = [];
  transactionForm: FormGroup;
  showForm = false;
  editingTransaction: any = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  filterSearch = '';
  filterType = '';
  filterCategoryId: number | undefined;
  filterDateFrom = '';
  filterDateTo = '';

  private searchSubject = new Subject<string>();

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private financialService: FinancialService,
    private authService: AuthService,
    private router: Router,
    public currencyService: CurrencyService
  ) {
    this.transactionForm = this.fb.group({
      description: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      transaction_date: [new Date().toISOString().split('T')[0], Validators.required],
      category_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.searchSubject.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => this.loadTransactions());
    this.loadCategories();
    this.loadTransactions();
  }

  onSearchInput(event: Event): void {
    this.filterSearch = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.filterSearch);
  }

  onFilterChange(field: string, value: string): void {
    if (field === 'type') this.filterType = value;
    if (field === 'category_id') this.filterCategoryId = value ? +value : undefined;
    if (field === 'date_from') this.filterDateFrom = value;
    if (field === 'date_to') this.filterDateTo = value;
    this.loadTransactions();
  }

  hasActiveFilters(): boolean {
    return !!(this.filterSearch || this.filterType || this.filterCategoryId || this.filterDateFrom || this.filterDateTo);
  }

  clearFilters(): void {
    this.filterSearch = '';
    this.filterType = '';
    this.filterCategoryId = undefined;
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.loadTransactions();
  }

  loadCategories(): void {
    forkJoin([
      this.financialService.getCategoriesByType('income').pipe(catchError(() => of([]))),
      this.financialService.getCategoriesByType('expense').pipe(catchError(() => of([]))),
      this.financialService.getCategoriesByType('savings').pipe(catchError(() => of([]))),
    ]).subscribe(([income, expense, savings]) => {
      this.categories = [...income, ...expense, ...savings];
    });
  }

  loadTransactions(): void {
    this.isLoading = true;
    const filters = {
      search: this.filterSearch || undefined,
      type: this.filterType || undefined,
      category_id: this.filterCategoryId,
      date_from: this.filterDateFrom || undefined,
      date_to: this.filterDateTo || undefined,
    };
    this.transactionService.getTransactions(filters).subscribe({
      next: (data) => { this.transactions = data; this.isLoading = false; },
      error: (error) => { this.errorMessage = error.message || 'Failed to load transactions'; this.isLoading = false; }
    });
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) return;
    this.isSaving = true;
    this.errorMessage = '';

    const obs = this.editingTransaction
      ? this.transactionService.updateTransaction(this.editingTransaction.id, this.transactionForm.value)
      : this.transactionService.createTransaction(this.transactionForm.value);

    obs.subscribe({
      next: () => { this.isSaving = false; this.loadTransactions(); this.cancelEdit(); },
      error: (error) => { this.isSaving = false; this.errorMessage = error.message || 'Failed to save transaction'; }
    });
  }

  editTransaction(transaction: any): void {
    this.editingTransaction = transaction;
    this.transactionForm.patchValue({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      transaction_date: transaction.transaction_date,
      category_id: transaction.category_id
    });
    this.showForm = true;
  }

  deleteTransaction(id: number): void {
    if (!confirm('Delete this transaction?')) return;
    this.transactionService.deleteTransaction(id).subscribe({
      next: () => this.loadTransactions(),
      error: (error) => this.errorMessage = error.message || 'Failed to delete transaction'
    });
  }

  exportCsv(): void {
    this.transactionService.exportTransactions({
      search: this.filterSearch || undefined,
      type: this.filterType || undefined,
      category_id: this.filterCategoryId,
      date_from: this.filterDateFrom || undefined,
      date_to: this.filterDateTo || undefined,
    });
  }

  cancelEdit(): void {
    this.editingTransaction = null;
    this.showForm = false;
    this.errorMessage = '';
    this.transactionForm.reset({
      type: 'expense',
      transaction_date: new Date().toISOString().split('T')[0]
    });
  }
}
