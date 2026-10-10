import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
  templateUrl: './quick-add.component.html'
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

    const payload = { ...this.form.value, type: this._activeTab };

    this.http.post(`${this.apiUrl}/transactions`, payload).subscribe({
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

    this.http.post(`${this.apiUrl}/investments`, payload).subscribe({
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
