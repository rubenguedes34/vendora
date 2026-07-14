import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FinancialService, Category } from '../../../services/financial.service';
import { AuthService } from '../../../services/auth.service';
import { CurrencyService } from '../../../services/currency.service';
import { environment } from '../../../../environments/environment';

const INVESTMENT_TYPES = ['Stocks', 'ETF', 'Crypto', 'Real Estate', 'Bonds', 'Savings Account', 'Other'];

@Component({
  selector: 'app-quick-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- FAB Button -->
    <button
      (click)="open = !open"
      class="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl hover:bg-primary-500 active:scale-95 transition-all flex items-center justify-center"
      title="Quick add">
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

      <!-- Tab bar: Expense / Income / Investment -->
      <div class="flex border-b border-gray-100">
        <button (click)="activeTab = 'expense'"
          class="flex-1 py-3 text-xs font-semibold transition-colors"
          [class.bg-red-50]="activeTab === 'expense'"
          [class.text-red-600]="activeTab === 'expense'"
          [class.text-gray-400]="activeTab !== 'expense'">
          − Expense
        </button>
        <button (click)="activeTab = 'income'"
          class="flex-1 py-3 text-xs font-semibold transition-colors"
          [class.bg-green-50]="activeTab === 'income'"
          [class.text-green-600]="activeTab === 'income'"
          [class.text-gray-400]="activeTab !== 'income'">
          + Income
        </button>
        <button (click)="activeTab = 'investment'"
          class="flex-1 py-3 text-xs font-semibold transition-colors"
          [class.bg-purple-50]="activeTab === 'investment'"
          [class.text-purple-600]="activeTab === 'investment'"
          [class.text-gray-400]="activeTab !== 'investment'">
          📈 Invest
        </button>
      </div>

      <!-- Transaction form (expense / income) -->
      <form *ngIf="activeTab !== 'investment'" [formGroup]="form" (ngSubmit)="onSubmit()" class="p-4 space-y-3">

        <!-- Amount -->
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-lg">{{ currencyService.symbol }}</span>
          <input formControlName="amount" type="number" step="0.01" min="0.01" placeholder="0.00"
            class="w-full pl-8 pr-3 py-3 text-2xl font-bold border-2 rounded-xl focus:outline-none transition-colors"
            [class.border-red-300]="activeTab === 'expense'"
            [class.border-green-300]="activeTab === 'income'" />
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
            No {{ activeTab }} categories yet —
            <a href="/budgets" (click)="close()" class="underline font-medium">add one in Budgets</a>
          </p>
        </div>

        <!-- Date -->
        <input formControlName="transaction_date" type="date"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />

        <p *ngIf="errorMsg" class="text-xs text-red-500">{{ errorMsg }}</p>
        <p *ngIf="successMsg" class="text-xs text-green-600 font-medium">{{ successMsg }}</p>

        <div class="flex gap-2 pt-1">
          <button type="button" (click)="close()"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" [disabled]="form.invalid || saving"
            class="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            [class.bg-red-500]="activeTab === 'expense'"
            [class.bg-green-500]="activeTab === 'income'">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </form>

      <!-- Investment form -->
      <form *ngIf="activeTab === 'investment'" [formGroup]="invForm" (ngSubmit)="onSubmitInvestment()" class="p-4 space-y-3">

        <!-- Name -->
        <input formControlName="name" type="text" placeholder="e.g. Apple, Bitcoin, S&P 500…"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />

        <!-- Type -->
        <select formControlName="type"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
          <option value="">Asset type</option>
          <option *ngFor="let t of investmentTypes" [value]="t">{{ t }}</option>
        </select>

        <!-- Amount invested -->
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">{{ currencyService.symbol }}</span>
          <input formControlName="initial_amount" type="number" step="0.01" min="0.01" placeholder="Amount invested"
            class="w-full pl-8 pr-3 py-2.5 text-lg font-bold border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400" />
        </div>

        <!-- Current value -->
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">{{ currencyService.symbol }}</span>
          <input formControlName="current_amount" type="number" step="0.01" min="0" placeholder="Current value (leave same if unknown)"
            class="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>

        <!-- Purchase date -->
        <input formControlName="purchase_date" type="date"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />

        <p *ngIf="invErrorMsg" class="text-xs text-red-500">{{ invErrorMsg }}</p>
        <p *ngIf="invSuccessMsg" class="text-xs text-purple-600 font-medium">{{ invSuccessMsg }}</p>

        <div class="flex gap-2 pt-1">
          <button type="button" (click)="close()"
            class="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" [disabled]="invForm.invalid || invSaving"
            class="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {{ invSaving ? 'Saving...' : 'Add Investment' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class QuickAddComponent implements OnInit {
  open = false;
  private _activeTab: 'expense' | 'income' | 'investment' = 'expense';
  get activeTab() { return this._activeTab; }
  set activeTab(v: 'expense' | 'income' | 'investment') {
    this._activeTab = v;
    if (v !== 'investment') {
      this.form.patchValue({ category_id: '' });
      this.filterCategories();
    }
  }

  form: FormGroup;
  saving = false;
  errorMsg = '';
  successMsg = '';

  invForm: FormGroup;
  invSaving = false;
  invErrorMsg = '';
  invSuccessMsg = '';

  allCategories: Category[] = [];
  filteredCategories: Category[] = [];
  loadingCategories = false;

  readonly investmentTypes = INVESTMENT_TYPES;
  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialService,
    private authService: AuthService,
    private http: HttpClient,
    public currencyService: CurrencyService
  ) {
    this.form = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: ['', Validators.required],
      category_id: ['', Validators.required],
      transaction_date: [new Date().toISOString().slice(0, 10), Validators.required],
    });

    this.invForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      initial_amount: ['', [Validators.required, Validators.min(0.01)]],
      current_amount: ['', [Validators.required, Validators.min(0)]],
      purchase_date: [new Date().toISOString().slice(0, 10), Validators.required],
    });

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

  filterCategories(): void {
    this.filteredCategories = this.allCategories.filter(c => c.type === this._activeTab);
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
    const payload = { ...this.form.value, type: this._activeTab };

    this.http.post(`${this.apiUrl}/transactions`, payload, { headers }).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Transaction saved!';
        this.form.patchValue({ amount: '', description: '', category_id: '', transaction_date: new Date().toISOString().slice(0, 10) });
        setTimeout(() => { this.successMsg = ''; this.open = false; }, 1200);
      },
      error: (err) => {
        this.saving = false;
        this.errorMsg = err?.error?.message || 'Failed to save. Try again.';
      }
    });
  }

  onSubmitInvestment(): void {
    if (this.invForm.invalid) return;
    this.invSaving = true;
    this.invErrorMsg = '';
    this.invSuccessMsg = '';

    const v = this.invForm.value;
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getTokenValue()}` });
    const payload = {
      name: v.name,
      type: v.type,
      initial_amount: v.initial_amount,
      current_amount: v.current_amount || v.initial_amount,
      purchase_date: v.purchase_date,
      units: null,
      price_per_unit: null,
      ticker_symbol: null,
    };

    this.http.post(`${this.apiUrl}/investments`, payload, { headers }).subscribe({
      next: () => {
        this.invSaving = false;
        this.invSuccessMsg = 'Investment added!';
        this.invForm.reset({ purchase_date: new Date().toISOString().slice(0, 10) });
        setTimeout(() => { this.invSuccessMsg = ''; this.open = false; }, 1200);
      },
      error: (err) => {
        this.invSaving = false;
        this.invErrorMsg = err?.error?.message || 'Failed to save. Try again.';
      }
    });
  }

  close(): void {
    this.open = false;
    this.errorMsg = '';
    this.successMsg = '';
    this.invErrorMsg = '';
    this.invSuccessMsg = '';
  }
}
