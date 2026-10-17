import {
  Component,
  OnInit,
  ChangeDetectorRef,
  DestroyRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FinancialService } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { environment } from '../../../environments/environment';
import { ApiError } from '../../models/api';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CoinMarket, assetTypeLabel } from '../../models/investment';
import { LanguageService } from '../../services/language.service';
import { MarketSearchResult } from '../../services/market-data.service';

const INVESTMENT_TYPES = [
  'Stocks',
  'ETF',
  'Crypto',
  'Real Estate',
  'Bonds',
  'Savings Account',
  'Other',
];
const TYPE_COLORS: Record<string, string> = {
  Stocks: '#8b5cf6',
  ETF: '#3b82f6',
  Crypto: '#f59e0b',
  'Real Estate': '#10b981',
  Bonds: '#6366f1',
  'Savings Account': '#14b8a6',
  Other: '#94a3b8',
};
const ACCOUNT_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#f59e0b',
  '#10b981',
  '#6366f1',
  '#14b8a6',
  '#ec4899',
  '#f43f5e',
  '#06b6d4',
  '#84cc16',
  '#a855f7',
  '#f97316',
];

@Component({
  selector: 'app-investments',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SidebarComponent,
    CurrencySymbolPipe,
    TranslatePipe,
  ],
  templateUrl: './investments.component.html',
})
export class InvestmentsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  readonly languageService = inject(LanguageService);

  investments: any[] = [];
  investmentForm: FormGroup;
  investmentTypes = INVESTMENT_TYPES;
  showForm = false;
  editingId: number | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  loadError = '';

  totalInitial = 0;
  totalCurrent = 0;
  totalGain = 0;
  totalRoi = 0;

  searchQuery = '';
  filterType = '';
  filterPerf = '';
  groupBy: 'type' | 'account' = 'type';

  donutSegments: {
    type: string;
    color: string;
    pct: number;
    dash: number;
    gap: number;
    offset: number;
  }[] = [];
  readonly Math = Math;

  tickerSymbol = '';
  fetchingPrice = false;
  quoteResult: {
    name: string;
    price: number;
    currency: string;
    exchange: string;
    change_24h: number | null;
    sparkline: number[];
  } | null = null;
  quoteError = '';

  // Market explorer
  marketTab: 'crypto' | 'stocks' = 'crypto';
  showMarketExplorer = false;

  // Crypto
  coins: CoinMarket[] = [];
  cryptoLoading = false;
  cryptoError = '';
  cryptoSearch = '';
  cryptoFilter = '';

  // Asset quick-pick catalogue (used in the Add form)
  readonly presetAssets = [
    { symbol: 'AAPL', name: 'Apple', type: 'Stocks', icon: '🍎', color: '#1d1d1f' },
    { symbol: 'MSFT', name: 'Microsoft', type: 'Stocks', icon: '🪟', color: '#00a4ef' },
    { symbol: 'GOOGL', name: 'Alphabet', type: 'Stocks', icon: '🔍', color: '#4285f4' },
    { symbol: 'NVDA', name: 'NVIDIA', type: 'Stocks', icon: '💚', color: '#76b900' },
    { symbol: 'AMZN', name: 'Amazon', type: 'Stocks', icon: '📦', color: '#ff9900' },
    { symbol: 'TSLA', name: 'Tesla', type: 'Stocks', icon: '⚡', color: '#e31937' },
    { symbol: 'META', name: 'Meta', type: 'Stocks', icon: '👤', color: '#0082fb' },
    { symbol: 'BRK-B', name: 'Berkshire', type: 'Stocks', icon: '🏦', color: '#6b46c1' },
    { symbol: 'VOO', name: 'VOO ETF', type: 'ETF', icon: '📊', color: '#e53e3e' },
    { symbol: 'SPY', name: 'S&P 500 ETF', type: 'ETF', icon: '📊', color: '#dd6b20' },
    { symbol: 'QQQ', name: 'Nasdaq ETF', type: 'ETF', icon: '📊', color: '#2b6cb0' },
    { symbol: 'VWCE.DE', name: 'VWCE', type: 'ETF', icon: '🌍', color: '#2f855a' },
    { symbol: 'IWDA.AS', name: 'IWDA', type: 'ETF', icon: '🌐', color: '#276749' },
    { symbol: 'BTC-USD', name: 'Bitcoin', type: 'Crypto', icon: '₿', color: '#f7931a' },
    { symbol: 'ETH-USD', name: 'Ethereum', type: 'Crypto', icon: 'Ξ', color: '#627eea' },
    { symbol: 'SOL-USD', name: 'Solana', type: 'Crypto', icon: '◎', color: '#9945ff' },
    { symbol: 'BNB-USD', name: 'BNB', type: 'Crypto', icon: '🔶', color: '#f3ba2f' },
    { symbol: 'XRP-USD', name: 'XRP', type: 'Crypto', icon: '✕', color: '#346aa9' },
  ];
  assetSearch = '';
  assetFilterType: 'All' | 'Stocks' | 'ETF' | 'Crypto' = 'All';

  get filteredPresetAssets() {
    const q = this.assetSearch.toLowerCase();
    return this.presetAssets.filter(
      (a) =>
        (this.assetFilterType === 'All' || a.type === this.assetFilterType) &&
        (!q || a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)),
    );
  }

  selectAsset(asset: { symbol: string; name: string; type: string }): void {
    this.tickerSymbol = asset.symbol;
    this.fetchingPrice = true;
    this.quoteResult = null;
    this.quoteError = '';
    this.http
      .get<any>(this.apiUrl + '/market/quote', { params: { symbol: asset.symbol } })
      .subscribe({
        next: (data) => {
          this.fetchingPrice = false;
          this.quoteResult = data;
          // auto-apply immediately
          const patch: any = { name: data.name, type: asset.type, price_per_unit: data.price };
          const invested = parseFloat(this.investmentForm.get('initial_amount')?.value) || 0;
          if (invested > 0 && data.price > 0) {
            patch.units = invested / data.price;
            patch.current_amount = (patch.units * data.price).toFixed(2);
          }
          this.investmentForm.patchValue(patch);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.fetchingPrice = false;
          this.quoteError =
            err?.error?.error ||
            this.translate.instant('investments.errors.quoteFailed', { symbol: asset.symbol });
          this.cdr.detectChanges();
        },
      });
  }

  // Stocks
  popularTickers = [
    'AAPL',
    'MSFT',
    'GOOGL',
    'NVDA',
    'VOO',
    'SPY',
    'QQQ',
    'VWCE.DE',
    'IWDA.AS',
    'BRK-B',
  ];
  stockSearch = '';
  stockLoading = false;
  stockError = '';
  stockQuote: {
    name: string;
    price: number;
    currency: string;
    exchange: string;
    change_24h: number | null;
    sparkline: number[];
    logo: string | null;
  } | null = null;
  stockSearchResults: { symbol: string; name: string; type: string; exchange: string }[] = [];
  showStockDropdown = false;
  private stockSearchTimer: ReturnType<typeof setTimeout> | null = null;

  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    public currencyService: CurrencyService,
    private cdr: ChangeDetectorRef,
  ) {
    this.investmentForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      account: [null],
      initial_amount: ['', [Validators.required, Validators.min(0.01)]],
      units: [null],
      price_per_unit: [null],
      current_amount: ['', [Validators.required, Validators.min(0)]],
      purchase_date: ['', Validators.required],
    });

    // Group labels ("No account") and type names are translated: rebuild when the language changes.
    this.languageService.language$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.recalcDonut();
      this.cdr.markForCheck();
    });

    this.investmentForm
      .get('initial_amount')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const price = parseFloat(this.investmentForm.get('price_per_unit')?.value) || 0;
        if (price <= 0) return;
        const invested = parseFloat(this.investmentForm.get('initial_amount')?.value) || 0;
        if (invested <= 0) return;
        const units = invested / price;
        this.investmentForm.patchValue(
          { units, current_amount: (units * price).toFixed(2) },
          { emitEvent: false },
        );
      });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadInvestments();
  }

  toggleMarketExplorer(): void {
    this.showMarketExplorer = !this.showMarketExplorer;
    if (this.showMarketExplorer && this.marketTab === 'crypto' && this.coins.length === 0) {
      this.loadCrypto();
    }
  }

  loadInvestments(forceRefresh = false): void {
    this.isLoading = true;
    this.loadError = '';
    this.financialService.getInvestments(forceRefresh).subscribe({
      next: (data) => {
        this.investments = data;
        this.recalcTotals();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err: ApiError) => {
        this.isLoading = false;
        const status = err?.status ? ' (HTTP ' + err.status + ')' : '';
        this.loadError =
          (err?.message ||
            err?.error?.message ||
            JSON.stringify(err) ||
            this.translate.instant('investments.errors.loadFailed')) + status;
        this.cdr.detectChanges();
      },
    });
  }

  autoRefreshPrices(investments: any[]): void {
    const withTicker = investments.filter((inv) => inv.ticker_symbol && +inv.units > 0);
    if (withTicker.length === 0) return;
    withTicker.forEach((inv) => {
      this.http
        .get<any>(this.apiUrl + '/market/quote', {
          params: { symbol: inv.ticker_symbol },
        })
        .subscribe({
          next: (data) => {
            const newCurrent = (+inv.units * data.price).toFixed(2);
            if (Math.abs(parseFloat(newCurrent) - parseFloat(inv.current_amount)) < 0.01) return;
            this.financialService
              .updateInvestment(inv.id, {
                ...inv,
                price_per_unit: data.price,
                current_amount: newCurrent,
              })
              .subscribe({
                next: () => {
                  inv.current_amount = newCurrent;
                  inv.price_per_unit = data.price;
                  this.recalcTotals();
                  this.cdr.detectChanges();
                },
              });
          },
        });
    });
  }

  toggleForm(): void {
    if (this.showForm && !this.editingId) {
      this.cancelEdit();
    } else {
      this.showForm = true;
    }
  }

  fetchPrice(): void {
    if (!this.tickerSymbol) return;
    this.fetchingPrice = true;
    this.quoteResult = null;
    this.quoteError = '';

    this.http
      .get<any>(this.apiUrl + '/market/quote', {
        params: { symbol: this.tickerSymbol.toUpperCase() },
      })
      .subscribe({
        next: (data) => {
          this.fetchingPrice = false;
          this.quoteResult = data;
        },
        error: (err) => {
          this.fetchingPrice = false;
          this.quoteError =
            err?.error?.error || this.translate.instant('investments.errors.symbolNotFound');
        },
      });
  }

  get pricePerUnitForDisplay(): string {
    const v = parseFloat(this.investmentForm.get('price_per_unit')?.value);
    return v > 0 ? v.toLocaleString(this.languageService.locale, { maximumFractionDigits: 6 }) : '';
  }

  get quoteCurrency(): string {
    return this.quoteResult?.currency || 'USD';
  }

  get quoteSymbol(): string {
    return this.currencyService.getSymbol(this.quoteCurrency);
  }

  get investmentCurrencySymbol(): string {
    return this.quoteResult ? this.quoteSymbol : this.currencyService.symbol;
  }

  get unitsForDisplay(): string {
    const invested = parseFloat(this.investmentForm.get('initial_amount')?.value) || 0;
    const price = parseFloat(this.investmentForm.get('price_per_unit')?.value) || 0;
    if (invested > 0 && price > 0) return (invested / price).toFixed(6);
    return '—';
  }

  applyQuote(): void {
    if (!this.quoteResult) return;
    const patch: any = { name: this.quoteResult.name, price_per_unit: this.quoteResult.price };
    if (!this.investmentForm.get('type')?.value) {
      const sym = this.tickerSymbol.toUpperCase();
      patch.type = sym.includes('-USD') || sym.includes('-EUR') ? 'Crypto' : 'Stocks';
    }
    const invested = parseFloat(this.investmentForm.get('initial_amount')?.value) || 0;
    const units =
      invested > 0 && this.quoteResult.price > 0 ? invested / this.quoteResult.price : null;
    if (units !== null) {
      patch.units = units;
      patch.current_amount = (units * this.quoteResult.price).toFixed(2);
    }
    this.investmentForm.patchValue(patch);
  }

  refreshingId: number | null = null;

  refreshPrice(inv: any): void {
    if (!inv.ticker_symbol && !inv.name) return;
    const sym = inv.ticker_symbol || inv.name.toUpperCase().replace(' ', '-');
    this.refreshingId = inv.id;
    this.http.get<any>(this.apiUrl + '/market/quote', { params: { symbol: sym } }).subscribe({
      next: (data) => {
        this.refreshingId = null;
        const units = +inv.units > 0 ? +inv.units : +inv.initial_amount / data.price;
        const newCurrent = (units * data.price).toFixed(2);
        this.financialService
          .updateInvestment(inv.id, {
            ...inv,
            units,
            price_per_unit: data.price,
            current_amount: newCurrent,
          })
          .subscribe({
            next: () => this.loadInvestments(true),
            error: () => {
              this.refreshingId = null;
              this.cdr.detectChanges();
            },
          });
      },
      error: () => {
        this.refreshingId = null;
        this.cdr.detectChanges();
      },
    });
  }

  get filteredInvestments(): any[] {
    return this.investments.filter((inv) => {
      const q = this.searchQuery.toLowerCase();
      if (q && !inv.name.toLowerCase().includes(q) && !inv.type.toLowerCase().includes(q))
        return false;
      if (this.filterType && inv.type !== this.filterType) return false;
      if (this.filterPerf === 'gain' && this.roi(inv) < 0) return false;
      if (this.filterPerf === 'loss' && this.roi(inv) >= 0) return false;
      return true;
    });
  }

  recalcTotals(): void {
    this.totalInitial = this.investments.reduce((s, i) => s + +i.initial_amount, 0);
    this.totalCurrent = this.investments.reduce((s, i) => s + +i.current_amount, 0);
    this.totalGain = this.totalCurrent - this.totalInitial;
    this.totalRoi = this.totalInitial > 0 ? (this.totalGain / this.totalInitial) * 100 : 0;
    this.recalcDonut();
  }

  recalcDonut(): void {
    if (this.totalCurrent === 0) {
      this.donutSegments = [];
      return;
    }
    const circumference = 2 * Math.PI * 54;
    const grouped: Record<string, number> = {};
    for (const inv of this.investments) {
      const key =
        this.groupBy === 'account'
          ? inv.account || this.translate.instant('investments.noAccount')
          : inv.type;
      grouped[key] = (grouped[key] || 0) + +inv.current_amount;
    }
    let offset = 0;
    this.donutSegments = Object.entries(grouped).map(([type, value]) => {
      const pct = (value / this.totalCurrent) * 100;
      const dash = (pct / 100) * circumference;
      const gap = circumference - dash;
      const seg = { type, color: this.colorForGroup(type), pct, dash, gap, offset };
      offset -= dash;
      return seg;
    });
  }

  typeLabel(type: string): string {
    return assetTypeLabel(this.translate, 'investments', type);
  }

  segLabel(seg: { type: string }): string {
    return this.groupBy === 'type' ? this.typeLabel(seg.type) : seg.type;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString(this.languageService.locale, {
      dateStyle: 'medium',
      timeZone: 'UTC',
    });
  }

  typeColor(type: string): string {
    return TYPE_COLORS[type] || '#94a3b8';
  }

  colorForGroup(key: string): string {
    if (this.groupBy === 'account') {
      const idx = key.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % ACCOUNT_COLORS.length;
      return ACCOUNT_COLORS[idx];
    }
    return TYPE_COLORS[key] || '#94a3b8';
  }

  roi(inv: any): number {
    const init = +inv.initial_amount;
    return init > 0 ? ((+inv.current_amount - init) / init) * 100 : 0;
  }

  gain(inv: any): number {
    return +inv.current_amount - +inv.initial_amount;
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      Stocks: '📈',
      ETF: '📊',
      Crypto: '₿',
      'Real Estate': '🏠',
      Bonds: '📜',
      'Savings Account': '🏦',
      Other: '💼',
    };
    return map[type] || '💼';
  }

  onSubmit(): void {
    if (this.investmentForm.invalid) return;
    this.isSaving = true;
    this.errorMessage = '';

    const v = this.investmentForm.value;
    const pricePerUnit = parseFloat(v.price_per_unit) || null;
    const invested = parseFloat(v.initial_amount) || 0;
    const units =
      pricePerUnit && invested > 0 ? invested / pricePerUnit : parseFloat(v.units) || null;
    const currentAmount =
      pricePerUnit && units ? (units * pricePerUnit).toFixed(2) : v.current_amount;

    const payload = {
      name: v.name,
      type: v.type,
      account: v.account || null,
      initial_amount: invested,
      units: units,
      price_per_unit: pricePerUnit,
      current_amount: currentAmount,
      purchase_date: v.purchase_date,
      ticker_symbol: this.tickerSymbol || null,
    };

    const obs = this.editingId
      ? this.financialService.updateInvestment(this.editingId, payload)
      : this.financialService.createInvestment(payload);

    obs.subscribe({
      next: () => {
        this.isSaving = false;
        this.loadInvestments(true);
        this.cancelEdit();
      },
      error: (err: ApiError) => {
        this.isSaving = false;
        this.errorMessage = err.message || this.translate.instant('investments.errors.saveFailed');
        this.cdr.detectChanges();
      },
    });
  }

  editInvestment(inv: any): void {
    this.editingId = inv.id;
    this.tickerSymbol = inv.ticker_symbol || '';
    this.assetSearch = '';
    this.quoteResult = null;
    this.quoteError = '';
    this.investmentForm.patchValue({
      name: inv.name,
      type: inv.type,
      account: inv.account ?? null,
      initial_amount: inv.initial_amount,
      units: inv.units ?? null,
      price_per_unit: inv.price_per_unit ?? null,
      current_amount: inv.current_amount,
      purchase_date: inv.purchase_date,
    });
    this.showForm = true;
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }

  deleteInvestment(id: number): void {
    if (!confirm(this.translate.instant('investments.confirmDelete'))) return;
    this.financialService.deleteInvestment(id).subscribe({
      next: () => this.loadInvestments(true),
      error: (err: ApiError) => {
        this.errorMessage =
          err.message || this.translate.instant('investments.errors.deleteFailed');
        this.cdr.detectChanges();
      },
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.showForm = false;
    this.errorMessage = '';
    this.quoteResult = null;
    this.quoteError = '';
    this.tickerSymbol = '';
    this.assetSearch = '';
    this.assetFilterType = 'All';
    this.investmentForm.reset();
  }

  // ---- Crypto (CoinGecko) ----
  loadCrypto(): void {
    this.cryptoLoading = true;
    this.cryptoError = '';
    this.http
      .get<CoinMarket[]>('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: '30',
          page: '1',
          sparkline: 'true',
          price_change_percentage: '24h',
        },
      })
      .subscribe({
        next: (data) => {
          this.coins = data;
          this.cryptoLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.cryptoLoading = false;
          this.cryptoError = this.translate.instant('investments.errors.cryptoLoadFailed');
          this.cdr.detectChanges();
        },
      });
  }

  get filteredCoins(): CoinMarket[] {
    return this.coins.filter((c) => {
      const q = this.cryptoSearch.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.symbol.toLowerCase().includes(q))
        return false;
      if (this.cryptoFilter === 'gain' && c.price_change_percentage_24h < 0) return false;
      if (this.cryptoFilter === 'loss' && c.price_change_percentage_24h >= 0) return false;
      return true;
    });
  }

  sparklinePoints(prices: number[]): string {
    if (!prices?.length) return '';
    const step = prices.length > 1 ? 100 / (prices.length - 1) : 0;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    return prices
      .map((p, i) => (i * step).toFixed(1) + ',' + (40 - ((p - min) / range) * 36).toFixed(1))
      .join(' ');
  }

  formatPrice(p: number): string {
    if (p >= 1000)
      return p.toLocaleString(this.languageService.locale, { maximumFractionDigits: 0 });
    if (p >= 1) return p.toLocaleString(this.languageService.locale, { maximumFractionDigits: 2 });
    return p.toFixed(6);
  }

  formatBigNum(n: number): string {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    return n.toLocaleString();
  }

  prefillFromCoin(coin: Pick<CoinMarket, 'name' | 'symbol' | 'current_price'>): void {
    this.showForm = true;
    this.editingId = null;
    this.investmentForm.patchValue({
      name: coin.name,
      type: 'Crypto',
      price_per_unit: coin.current_price,
      purchase_date: new Date().toISOString().slice(0, 10),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- Stocks / ETFs (Finnhub via backend) ----
  onStockSearchChange(value: string): void {
    clearTimeout(this.stockSearchTimer ?? undefined);
    this.showStockDropdown = false;
    this.stockSearchResults = [];
    if (!value || value.length < 2) return;
    this.stockSearchTimer = setTimeout(() => {
      this.http
        .get<MarketSearchResult[]>(this.apiUrl + '/market/search', { params: { q: value } })
        .subscribe({
          next: (results) => {
            this.stockSearchResults = results || [];
            this.showStockDropdown = this.stockSearchResults.length > 0;
            this.cdr.detectChanges();
          },
          error: () => {
            this.stockSearchResults = [];
            this.cdr.detectChanges();
          },
        });
    }, 350);
  }

  pickStockResult(r: { symbol: string; name: string; type: string; exchange: string }): void {
    this.stockSearch = r.symbol;
    this.stockSearchResults = [];
    this.showStockDropdown = false;
    this.fetchStockQuote();
  }

  hideStockDropdown(): void {
    setTimeout(() => {
      this.showStockDropdown = false;
    }, 200);
  }

  fetchStockQuote(): void {
    if (!this.stockSearch) return;
    this.stockLoading = true;
    this.stockError = '';
    this.stockQuote = null;
    this.showStockDropdown = false;
    this.http
      .get<any>(this.apiUrl + '/market/quote', {
        params: { symbol: this.stockSearch.toUpperCase() },
      })
      .subscribe({
        next: (data) => {
          this.stockQuote = data;
          this.stockLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.stockLoading = false;
          this.stockError =
            err?.error?.error ||
            this.translate.instant('investments.errors.tickerNotFound', {
              symbol: this.stockSearch,
            });
          this.cdr.detectChanges();
        },
      });
  }

  sparklineArea(prices: number[]): string {
    if (!prices || prices.length < 2) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pts = prices.map((p, i) => {
      const x = (i / (prices.length - 1)) * 100;
      const y = 40 - ((p - min) / range) * 36;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `0,40 ${pts.join(' ')} 100,40`;
  }

  prefillFromStock(): void {
    if (!this.stockQuote) return;
    this.showForm = true;
    this.editingId = null;
    const sym = this.stockSearch.toUpperCase();
    this.investmentForm.patchValue({
      name: this.stockQuote.name,
      type:
        sym.includes('ETF') || ['VOO', 'SPY', 'QQQ', 'VWCE.DE', 'IWDA.AS'].includes(sym)
          ? 'ETF'
          : 'Stocks',
      price_per_unit: this.stockQuote.price,
      purchase_date: new Date().toISOString().slice(0, 10),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
