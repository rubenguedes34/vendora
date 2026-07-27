import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { FinancialService, Category } from '../../../services/financial.service';
import { AuthService } from '../../../services/auth.service';
import { CurrencyService } from '../../../services/currency.service';
import { VoiceService } from '../../../services/voice.service';
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
      class="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-6 z-50 w-14 h-14 rounded-full bg-primary-600 text-white shadow-xl hover:bg-primary-500 active:scale-95 transition-all flex items-center justify-center safe-bottom"
      title="Quick add">
      <svg class="w-7 h-7 transition-transform duration-200" [class.rotate-45]="open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
    </button>

    <!-- Modal backdrop -->
    <div *ngIf="open"
      (click)="close()"
      class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity">
    </div>

    <!-- Modal panel -->
    <div *ngIf="open"
      class="fixed bottom-[max(6rem,env(safe-area-inset-bottom)+4.5rem)] right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 max-h-[80dvh] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

      <!-- Tab bar: Expense / Income / Investment -->
      <div class="flex border-b border-gray-200">
        <button (click)="activeTab = 'expense'"
          class="group relative flex-1 py-3.5 text-xs font-medium tracking-wide transition-colors"
          [class.text-gray-900]="activeTab === 'expense'"
          [class.text-gray-400]="activeTab !== 'expense'">
          <span class="relative z-10">− Expense</span>
          <span class="absolute left-0 bottom-0 h-[2px] rounded-full bg-gray-900 transition-all duration-300 ease-out"
            [class.w-full]="activeTab === 'expense'"
            [class.w-0]="activeTab !== 'expense'"
            [class.group-hover:w-full]="activeTab !== 'expense'"></span>
        </button>
        <button (click)="activeTab = 'income'"
          class="group relative flex-1 py-3.5 text-xs font-medium tracking-wide transition-colors"
          [class.text-gray-900]="activeTab === 'income'"
          [class.text-gray-400]="activeTab !== 'income'">
          <span class="relative z-10">+ Income</span>
          <span class="absolute left-0 bottom-0 h-[2px] rounded-full bg-gray-900 transition-all duration-300 ease-out"
            [class.w-full]="activeTab === 'income'"
            [class.w-0]="activeTab !== 'income'"
            [class.group-hover:w-full]="activeTab !== 'income'"></span>
        </button>
        <button (click)="activeTab = 'investment'"
          class="group relative flex-1 py-3.5 text-xs font-medium tracking-wide transition-colors"
          [class.text-gray-900]="activeTab === 'investment'"
          [class.text-gray-400]="activeTab !== 'investment'">
          <span class="relative z-10">Invest</span>
          <span class="absolute left-0 bottom-0 h-[2px] rounded-full bg-gray-900 transition-all duration-300 ease-out"
            [class.w-full]="activeTab === 'investment'"
            [class.w-0]="activeTab !== 'investment'"
            [class.group-hover:w-full]="activeTab !== 'investment'"></span>
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
            <option *ngFor="let c of filteredCategories" [value]="c.id">{{ selectIcon(c.icon) }} {{ c.name }}</option>
          </select>
          <p *ngIf="filteredCategories.length === 0 && !loadingCategories" class="text-xs text-orange-500 mt-1">
            No {{ activeTab }} categories are available.
          </p>
        </div>

        <!-- Date -->
        <input formControlName="transaction_date" type="date"
          class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />

        <p *ngIf="errorMsg" class="text-xs text-red-500">{{ errorMsg }}</p>
        <p *ngIf="successMsg" class="text-xs text-green-600 font-medium">{{ successMsg }}</p>

        <!-- Voice input -->
        <div *ngIf="voiceSupported" class="space-y-2">
          <button *ngIf="!voiceListening" type="button" (click)="toggleVoice()"
            class="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-primary-300 text-sm text-primary-700 hover:bg-primary-50 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            Add by voice — covers amount, description & date
          </button>
          <button *ngIf="voiceListening" type="button" (click)="toggleVoice()"
            class="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 hover:bg-red-100 transition-colors animate-pulse">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Stop listening
          </button>
          <p class="text-[10px] text-gray-400 leading-tight">
            Try: <span class="italic">"Expense 42.50 groceries today"</span>, <span class="italic">"Income 2000 salary"</span>, <span class="italic">"Investment 500 Apple stock"</span>
          </p>
          <div *ngIf="voiceListening || voiceTranscript || voiceError" class="space-y-1">
            <p *ngIf="voiceListening && !voiceTranscript" class="text-xs text-primary-600 font-medium animate-pulse">Listening...</p>
            <p *ngIf="voiceTranscript" class="text-xs text-gray-600 italic">“{{ voiceTranscript }}”</p>
            <p *ngIf="voiceError" class="text-xs text-red-500">{{ voiceError }}</p>
          </div>
        </div>

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

        <!-- Voice input -->
        <div *ngIf="voiceSupported" class="space-y-2">
          <button *ngIf="!voiceListening" type="button" (click)="toggleVoice()"
            class="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-purple-300 text-sm text-purple-700 hover:bg-purple-50 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
            </svg>
            Add by voice — covers amount, name & date
          </button>
          <button *ngIf="voiceListening" type="button" (click)="toggleVoice()"
            class="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 hover:bg-red-100 transition-colors animate-pulse">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Stop listening
          </button>
          <p class="text-[10px] text-gray-400 leading-tight">
            Try: <span class="italic">"Investment 500 Apple stock"</span>, <span class="italic">"Bought 1000 Bitcoin"</span>, <span class="italic">"ETF 250 S&P 500"</span>
          </p>
          <div *ngIf="voiceListening || voiceTranscript || voiceError" class="space-y-1">
            <p *ngIf="voiceListening && !voiceTranscript" class="text-xs text-primary-600 font-medium animate-pulse">Listening...</p>
            <p *ngIf="voiceTranscript" class="text-xs text-gray-600 italic">“{{ voiceTranscript }}”</p>
            <p *ngIf="voiceError" class="text-xs text-red-500">{{ voiceError }}</p>
          </div>
        </div>

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
export class QuickAddComponent implements OnInit, OnDestroy {
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

  voiceSupported = false;
  voiceListening = false;
  voiceTranscript = '';
  voiceError: string | null = null;

  private voiceSub = new Subscription();

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialService,
    private authService: AuthService,
    private http: HttpClient,
    public currencyService: CurrencyService,
    private voiceService: VoiceService
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
    this.voiceSupported = this.voiceService.supported;
    this.voiceSub.add(
      this.voiceService.listening$.subscribe(listening => this.voiceListening = listening)
    );
    this.voiceSub.add(
      this.voiceService.transcript$.subscribe(text => {
        this.voiceTranscript = text;
        if (text) {
          this.applyVoiceCommand(text);
        }
      })
    );
    this.voiceSub.add(
      this.voiceService.error$.subscribe(err => this.voiceError = err)
    );

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

  ngOnDestroy(): void {
    this.voiceSub.unsubscribe();
    this.voiceService.stop();
  }

  toggleVoice(): void {
    this.voiceError = null;
    this.voiceTranscript = '';
    this.voiceService.toggle();
  }

  private applyVoiceCommand(text: string): void {
    const command = this.voiceService.parseCommand(text);
    if (!command.type) return;

    if (command.type === 'investment') {
      this.activeTab = 'investment';
      if (command.amount != null) {
        this.invForm.patchValue({
          initial_amount: command.amount,
          current_amount: command.amount,
        });
      }
      if (command.description) {
        const guessedType = this.guessInvestmentType(command.description);
        this.invForm.patchValue({
          name: command.description,
          type: guessedType,
        });
      }
      if (command.date) {
        this.invForm.patchValue({ purchase_date: command.date });
      }
    } else {
      this.activeTab = command.type;
      if (command.amount != null) {
        this.form.patchValue({ amount: command.amount });
      }
      if (command.description) {
        this.form.patchValue({ description: command.description });
        const matched = this.guessCategory(command.description, command.type);
        if (matched) {
          this.form.patchValue({ category_id: String(matched.id) });
        }
      }
      if (command.date) {
        this.form.patchValue({ transaction_date: command.date });
      }
    }
  }

  selectIcon(icon?: string): string {
    return icon?.startsWith('http://') || icon?.startsWith('https://') ? '' : icon || '';
  }

  private guessCategory(description: string, type: 'expense' | 'income'): Category | null {
    const words = description.toLowerCase().split(/\s+/);
    const candidates = this.allCategories.filter(c => c.type === type);
    for (const word of words) {
      const match = candidates.find(c => c.name.toLowerCase().includes(word) || word.includes(c.name.toLowerCase()));
      if (match) return match;
    }
    return candidates[0] ?? null;
  }

  private guessInvestmentType(description: string): string {
    const d = description.toLowerCase();
    if (/(stock|share|equity)/.test(d)) return 'Stocks';
    if (/(etf|index|fund)/.test(d)) return 'ETF';
    if (/(crypto|bitcoin|ethereum|btc|eth)/.test(d)) return 'Crypto';
    if (/(real estate|property|house|land)/.test(d)) return 'Real Estate';
    if (/(bond|fixed income)/.test(d)) return 'Bonds';
    if (/(savings|deposit)/.test(d)) return 'Savings Account';
    return '';
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
    this.voiceService.stop();
    this.voiceTranscript = '';
    this.voiceError = null;
  }
}
