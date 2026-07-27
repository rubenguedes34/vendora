import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { FinancialService, Category } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { environment } from '../../../environments/environment';

interface RecurrentTransaction {
  id?: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category_id: number;
  day_of_month: number;
  category?: Category;
}

@Component({
  selector: 'app-recurrent-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, CurrencySymbolPipe],
  template: `
    <ng-container *ngIf="!embedded; else embeddedTpl">
      <div class="min-h-screen bg-gray-100 flex">
        <app-sidebar></app-sidebar>

        <main class="flex-1 overflow-auto pt-14 lg:pt-0 pb-20 lg:pb-0">
          <ng-container *ngTemplateOutlet="contentTpl"></ng-container>
        </main>
      </div>
    </ng-container>

    <ng-template #embeddedTpl>
      <ng-container *ngTemplateOutlet="contentTpl"></ng-container>
    </ng-template>

    <ng-template #contentTpl>
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <h2 class="text-xl font-semibold">Monthly Recurrent Transactions</h2>
            </div>
          </div>
        </header>

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <p class="text-gray-600 mb-6">
            Define transactions that repeat monthly. They will be automatically copied to each month on the specified day.
          </p>

          <!-- Add Form -->
          <div class="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-4">{{ editing ? 'Edit Recurrent Transaction' : 'Add Recurrent Transaction' }}</h3>
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Description</label>
                  <input type="text" formControlName="description"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Netflix subscription" />
                </div>

                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Amount ({{ currencyService.symbol }})</label>
                  <input type="number" step="0.01" formControlName="amount"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00" min="0" />
                </div>

                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Type</label>
                  <select formControlName="type"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div>
                  <label class="block text-gray-700 text-sm font-bold mb-2">Day of Month</label>
                  <input type="number" formControlName="day_of_month"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., 1" min="1" max="28" />
                  <p class="text-xs text-gray-500 mt-1">Day 1–28 to ensure all months are covered</p>
                </div>

                <div class="md:col-span-2">
                  <label class="block text-gray-700 text-sm font-bold mb-2">Category</label>
                  <select formControlName="category_id"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">Select a category</option>
                    <option *ngFor="let cat of categories" [value]="cat.id">{{ cat.name }}</option>
                  </select>
                </div>
              </div>

              <div class="mt-4 flex space-x-3">
                <button type="submit" [disabled]="form.invalid"
                  class="bg-primary-500 text-white px-6 py-2 rounded-md hover:bg-primary-600 disabled:bg-gray-400 transition-colors">
                  {{ editing ? 'Update' : 'Add' }}
                </button>
                <button *ngIf="editing" type="button" (click)="cancelEdit()"
                  class="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <!-- Copy to Month -->
          <div class="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 class="text-lg font-semibold text-gray-800 mb-3">Copy to Month</h3>
            <p class="text-gray-600 text-sm mb-4">Copy all recurrent transactions to a specific month as real transactions.</p>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input type="month" [(ngModel)]="copyTargetMonth" [ngModelOptions]="{standalone: true}"
                class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-auto" />
              <button (click)="copyToMonth()"
                [disabled]="!copyTargetMonth || isCopying"
                class="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors w-full sm:w-auto">
                {{ isCopying ? 'Copying...' : 'Copy Now' }}
              </button>
            </div>
            <p *ngIf="copyMessage" class="mt-2 text-sm" [class.text-green-600]="copySuccess" [class.text-red-500]="!copySuccess">
              {{ copyMessage }}
            </p>
          </div>

          <!-- List -->
          <div class="bg-white rounded-lg shadow-md">
            <div class="p-6">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Recurrent Transactions ({{ recurrentList.length }})</h3>

              <div *ngIf="recurrentList.length === 0" class="text-gray-500 text-center py-8">
                No recurrent transactions yet. Add one above.
              </div>

              <div *ngFor="let item of recurrentList" class="flex justify-between items-center py-4 border-b last:border-b-0">
                <div class="flex-1">
                  <p class="font-medium text-gray-800">{{ item.description }}</p>
                  <p class="text-sm text-gray-500">{{ item.category?.name || 'No category' }} · Day {{ item.day_of_month }} of each month</p>
                </div>
                <div class="flex items-center space-x-4">
                  <p [class]="item.type === 'income' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'">
                    {{ item.type === 'income' ? '+' : '-' }}{{ item.amount | currencySymbol }}
                  </p>
                  <button (click)="editItem(item)" class="text-primary-600 hover:text-primary-800 text-sm">Edit</button>
                  <button (click)="deleteItem(item.id!)" class="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="errorMessage" class="mt-4 text-red-500 text-center">{{ errorMessage }}</div>
        </div>
    </ng-template>
  `
})
export class RecurrentTransactionsComponent implements OnInit {
  @Input() embedded = false;

  form: FormGroup;
  recurrentList: RecurrentTransaction[] = [];
  categories: Category[] = [];
  editing: RecurrentTransaction | null = null;
  errorMessage = '';
  copyTargetMonth = '';
  isCopying = false;
  copyMessage = '';
  copySuccess = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private financialService: FinancialService,
    private http: HttpClient,
    private router: Router,
    public currencyService: CurrencyService
  ) {
    this.form = this.fb.group({
      description: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      type: ['expense', Validators.required],
      category_id: ['', Validators.required],
      day_of_month: ['', [Validators.required, Validators.min(1), Validators.max(28)]],
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadCategories();
    this.loadRecurrent();
    const now = new Date();
    this.copyTargetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getTokenValue()}`
    });
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

  loadRecurrent(): void {
    this.http.get<RecurrentTransaction[]>(`${this.apiUrl}/recurrent-transactions`, { headers: this.headers() }).subscribe({
      next: data => {
        this.recurrentList = data;
        this.errorMessage = '';
      },
      error: err => this.errorMessage = err.error?.message || 'Failed to load recurrent transactions'
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const payload = this.form.value;

    if (this.editing) {
      this.http.put<RecurrentTransaction>(`${this.apiUrl}/recurrent-transactions/${this.editing.id}`, payload, { headers: this.headers() }).subscribe({
        next: (item) => {
          this.recurrentList = this.recurrentList.map(i => i.id === item.id ? item : i);
          this.cancelEdit();
          this.errorMessage = '';
        },
        error: err => this.errorMessage = err.error?.message || 'Failed to update'
      });
    } else {
      this.http.post<RecurrentTransaction>(`${this.apiUrl}/recurrent-transactions`, payload, { headers: this.headers() }).subscribe({
        next: (item) => {
          this.recurrentList = [...this.recurrentList, item];
          this.form.reset({ type: 'expense' });
          this.errorMessage = '';
        },
        error: err => this.errorMessage = err.error?.message || 'Failed to add'
      });
    }
  }

  editItem(item: RecurrentTransaction): void {
    this.editing = item;
    this.form.patchValue({
      ...item,
      category_id: item.category_id ? String(item.category_id) : '',
    });
  }

  cancelEdit(): void {
    this.editing = null;
    this.form.reset({ type: 'expense' });
  }

  deleteItem(id: number): void {
    if (!confirm('Delete this recurrent transaction?')) return;
    this.http.delete(`${this.apiUrl}/recurrent-transactions/${id}`, { headers: this.headers() }).subscribe({
      next: () => this.loadRecurrent(),
      error: err => this.errorMessage = err.error?.message || 'Failed to delete'
    });
  }

  copyToMonth(): void {
    this.isCopying = true;
    this.copyMessage = '';
    this.http.post(`${this.apiUrl}/recurrent-transactions/copy`, { month: this.copyTargetMonth }, { headers: this.headers() }).subscribe({
      next: (res: any) => {
        this.isCopying = false;
        this.copySuccess = true;
        this.copyMessage = `Copied ${res.created} transaction(s) to ${this.copyTargetMonth}.`;
      },
      error: err => {
        this.isCopying = false;
        this.copySuccess = false;
        this.copyMessage = err.error?.message || 'Failed to copy transactions';
      }
    });
  }
}
