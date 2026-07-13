import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FinancialService, Category } from '../../../services/financial.service';
import { AuthService } from '../../../services/auth.service';
import { CurrencyService } from '../../../services/currency.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-quick-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- FAB Button -->
    <button
      (click)="open = !open"
      class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl hover:bg-primary-500 active:scale-95 transition-all flex items-center justify-center"
      title="Quick add transaction">
      <svg class="w-7 h-7 transition-transform duration-200" [class.rotate-45]="open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
    </button>

    <!-- Modal backdrop -->
    <div *ngIf="open"
      (click)="close()"
      class="fixed inset-0 z-40 bg-black bg-opacity-40 backdrop-blur-sm transition-opacity">
    </div>

    <!-- Modal panel -->
    <div *ngIf="open"
      class="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

      <!-- Header with type tabs -->
      <div class="flex border-b border-gray-100">
        <button (click)="setType('expense')"
          class="flex-1 py-3.5 text-sm font-semibold transition-colors"
          [class.bg-red-50]="form.get('type')?.value === 'expense'"
          [class.text-red-600]="form.get('type')?.value === 'expense'"
          [class.text-gray-400]="form.get('type')?.value !== 'expense'">
          − Expense
        </button>
        <button (click)="setType('income')"
          class="flex-1 py-3.5 text-sm font-semibold transition-colors"
          [class.bg-green-50]="form.get('type')?.value === 'income'"
          [class.text-green-600]="form.get('type')?.value === 'income'"
          [class.text-gray-400]="form.get('type')?.value !== 'income'">
          + Income
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="p-4 space-y-3">

        <!-- Amount — big and prominent -->
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">{{ currencyService.symbol }}</span>
          <input formControlName="amount" type="number" step="0.01" min="0.01" placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 text-2xl font-bold border-2 rounded-xl focus:outline-none transition-colors"
            [class.border-red-300]="form.get('type')?.value === 'expense'"
            [class.focus:border-red-400]="form.get('type')?.value === 'expense'"
            [class.border-green-300]="form.get('type')?.value === 'income'"
            [class.focus:border-green-400]="form.get('type')?.value === 'income'" />
        </div>

        <!-- Description -->
        <input formControlName="description" type="text" placeholder="Description (e.g. Groceries)"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />

        <!-- Category -->
        <div>
          <select formControlName="category_id"
            class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
            <option value="">Select category</option>
            <option *ngFor="let c of filteredCategories" [value]="c.id">{{ c.icon || '' }} {{ c.name }}</option>
          </select>
          <p *ngIf="filteredCategories.length === 0 && !loadingCategories" class="text-xs text-orange-500 mt-1">
            No {{ form.get('type')?.value }} categories yet —
            <a href="/budgets" (click)="close()" class="underline font-medium">add one in Budgets</a>
          </p>
        </div>

        <!-- Date -->
        <input formControlName="transaction_date" type="date"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />

        <!-- Error / Success -->
        <p *ngIf="errorMsg" class="text-xs text-red-500">{{ errorMsg }}</p>
        <p *ngIf="successMsg" class="text-xs text-green-600 font-medium">{{ successMsg }}</p>

        <!-- Actions -->
        <div class="flex gap-2 pt-1">
          <button type="button" (click)="close()"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" [disabled]="form.invalid || saving"
            class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            [class.bg-red-500]="form.get('type')?.value === 'expense'"
            [class.hover:bg-red-600]="form.get('type')?.value === 'expense'"
            [class.bg-green-500]="form.get('type')?.value === 'income'"
            [class.hover:bg-green-600]="form.get('type')?.value === 'income'">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class QuickAddComponent implements OnInit {
  open = false;
  form: FormGroup;
  saving = false;
  errorMsg = '';
  successMsg = '';

  allCategories: Category[] = [];
  filteredCategories: Category[] = [];
  loadingCategories = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialService,
    private authService: AuthService,
    private http: HttpClient,
    public currencyService: CurrencyService
  ) {
    this.form = this.fb.group({
      type: ['expense'],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: ['', Validators.required],
      category_id: ['', Validators.required],
      transaction_date: [new Date().toISOString().slice(0, 10), Validators.required],
    });

    this.form.get('type')!.valueChanges.subscribe(() => this.filterCategories());
  }

  ngOnInit(): void {
    this.loadingCategories = true;
    this.financialService.getAllCategories().subscribe({
      next: (cats) => {
        this.allCategories = cats;
        this.filterCategories();
        this.loadingCategories = false;
      },
      error: () => { this.loadingCategories = false; }
    });
  }

  setType(type: 'income' | 'expense'): void {
    this.form.patchValue({ type, category_id: '' });
  }

  filterCategories(): void {
    const type = this.form.get('type')?.value;
    this.filteredCategories = this.allCategories.filter(c => c.type === type);
    const cur = this.form.get('category_id')?.value;
    if (cur && !this.filteredCategories.find(c => c.id === +cur)) {
      this.form.patchValue({ category_id: '' });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.errorMsg = '';
    this.successMsg = '';

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getTokenValue()}` });
    const payload = { ...this.form.value };

    this.http.post(`${this.apiUrl}/transactions`, payload, { headers }).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Transaction saved!';
        this.form.patchValue({
          amount: '',
          description: '',
          category_id: '',
          transaction_date: new Date().toISOString().slice(0, 10),
        });
        setTimeout(() => {
          this.successMsg = '';
          this.open = false;
        }, 1200);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err?.error?.message || 'Failed to save. Try again.';
      }
    });
  }

  close(): void {
    this.open = false;
    this.errorMsg = '';
    this.successMsg = '';
  }
}
