import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { vi } from 'vitest';
import { of, BehaviorSubject } from 'rxjs';

import { InvestmentsComponent } from './investments.component';
import { AuthService } from '../../services/auth.service';
import { FinancialService } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { ThemeService } from '../../services/theme.service';

// ─── stub services ───────────────────────────────────────────────────────────

const mockAuth = {
  isLoggedIn: vi.fn().mockReturnValue(true),
  getTokenValue: vi.fn().mockReturnValue('test-token'),
  getUserObservable: vi.fn().mockReturnValue(new BehaviorSubject({ id: 1, name: 'Test User', email: 'test@example.com' }).asObservable()),
  logout: vi.fn().mockReturnValue(of({})),
  clearAuth: vi.fn(),
};

const mockFinancial = {
  getInvestments: vi.fn().mockReturnValue(of([])),
  createInvestment: vi.fn().mockReturnValue(of({})),
  updateInvestment: vi.fn().mockReturnValue(of({})),
  deleteInvestment: vi.fn().mockReturnValue(of({})),
  getAllCategories: vi.fn().mockReturnValue(of([])),
};

// CurrencyService is providedIn root with no HTTP deps — use the real one

const routes = [
  { path: 'login', component: class {} },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildInvestment(overrides: any = {}) {
  return {
    id: 1,
    name: 'Apple',
    type: 'Stocks',
    initial_amount: '1000',
    current_amount: '1100',
    units: '5',
    price_per_unit: '220',
    purchase_date: '2024-01-01',
    ticker_symbol: 'AAPL',
    ...overrides,
  };
}

// ─── suite ───────────────────────────────────────────────────────────────────

describe('InvestmentsComponent', () => {
  let fixture: ComponentFixture<InvestmentsComponent>;
  let component: InvestmentsComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    mockFinancial.getInvestments.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [InvestmentsComponent, ReactiveFormsModule, FormsModule],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuth },
        { provide: FinancialService, useValue: mockFinancial },
        CurrencyService,
        ThemeService,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestmentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      // flush ALL pending requests (including external CoinGecko calls from ngOnInit)
      httpMock.match(() => true).forEach(r => {
        if (!r.cancelled) r.flush([]);
      });
    } catch {}
    try { httpMock.verify(); } catch {}
  });

  // ── creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    fixture.detectChanges();
    // flush CoinGecko request triggered by ngOnInit → loadCrypto()
    httpMock.match(() => true).forEach(r => { if (!r.cancelled) r.flush([]); });
    expect(component).toBeTruthy();
  });

  // ── layout: form always visible (no *ngIf="showForm" on the grid) ─────────

  it('showForm starts false', () => {
    expect(component.showForm).toBe(false);
  });

  it('toggleForm() sets showForm to true when it was false', () => {
    component.toggleForm();
    expect(component.showForm).toBe(true);
  });

  it('toggleForm() calls cancelEdit when showForm=true and not editing', () => {
    component.showForm = true;
    component.editingId = null;
    const spy = vi.spyOn(component, 'cancelEdit');
    component.toggleForm();
    expect(spy).toHaveBeenCalled();
  });

  it('toggleForm() keeps showForm true when editing (does not cancel)', () => {
    component.showForm = true;
    component.editingId = 42;
    component.toggleForm();
    expect(component.showForm).toBe(true);
  });

  // ── cancelEdit resets all state ───────────────────────────────────────────

  it('cancelEdit() resets showForm, editingId, quoteResult, tickerSymbol, assetSearch, assetFilterType', () => {
    component.showForm = true;
    component.editingId = 5;
    component.quoteResult = { name: 'X', price: 1, currency: 'USD', exchange: 'NYSE', change_24h: 0, sparkline: [] };
    component.quoteError = 'some error';
    component.tickerSymbol = 'AAPL';
    component.assetSearch = 'apple';
    component.assetFilterType = 'Stocks';

    component.cancelEdit();

    expect(component.showForm).toBe(false);
    expect(component.editingId).toBeNull();
    expect(component.quoteResult).toBeNull();
    expect(component.quoteError).toBe('');
    expect(component.tickerSymbol).toBe('');
    expect(component.assetSearch).toBe('');
    expect(component.assetFilterType).toBe('All');
  });

  it('cancelEdit() resets the form controls', () => {
    component.investmentForm.patchValue({ name: 'Test', type: 'Stocks' });
    component.cancelEdit();
    expect(component.investmentForm.get('name')?.value).toBeNull();
  });

  // ── editInvestment populates form ────────────────────────────────────────

  it('editInvestment() sets editingId, showForm, and patches the form', () => {
    const inv = buildInvestment({ id: 7, ticker_symbol: 'MSFT' });
    component.editInvestment(inv);

    expect(component.editingId).toBe(7);
    expect(component.showForm).toBe(true);
    expect(component.tickerSymbol).toBe('MSFT');
    expect(component.investmentForm.get('name')?.value).toBe('Apple');
    expect(component.investmentForm.get('type')?.value).toBe('Stocks');
  });

  it('editInvestment() clears assetSearch and quoteResult', () => {
    component.assetSearch = 'old';
    component.quoteResult = { name: 'X', price: 1, currency: 'USD', exchange: 'NYSE', change_24h: 0, sparkline: [] };
    component.editInvestment(buildInvestment());

    expect(component.assetSearch).toBe('');
    expect(component.quoteResult).toBeNull();
  });

  // ── recalcTotals ──────────────────────────────────────────────────────────

  it('recalcTotals() computes gain and ROI correctly', () => {
    component.investments = [
      buildInvestment({ initial_amount: '1000', current_amount: '1200' }),
      buildInvestment({ id: 2, initial_amount: '500', current_amount: '400' }),
    ];
    component.recalcTotals();

    expect(component.totalInitial).toBe(1500);
    expect(component.totalCurrent).toBe(1600);
    expect(component.totalGain).toBeCloseTo(100);
    expect(component.totalRoi).toBeCloseTo(6.666, 2);
  });

  it('recalcTotals() ROI is 0 when totalInitial is 0', () => {
    component.investments = [];
    component.recalcTotals();
    expect(component.totalRoi).toBe(0);
  });

  // ── recalcDonut ───────────────────────────────────────────────────────────

  it('recalcDonut() produces one segment per type', () => {
    component.investments = [
      buildInvestment({ type: 'Stocks', current_amount: '500' }),
      buildInvestment({ id: 2, type: 'Crypto', current_amount: '500' }),
    ];
    component.recalcTotals();

    expect(component.donutSegments.length).toBe(2);
    const types = component.donutSegments.map(s => s.type);
    expect(types).toContain('Stocks');
    expect(types).toContain('Crypto');
  });

  it('recalcDonut() is empty when totalCurrent is 0', () => {
    component.investments = [];
    component.recalcTotals();
    expect(component.donutSegments).toEqual([]);
  });

  // ── roi / gain helpers ────────────────────────────────────────────────────

  it('roi() returns correct percentage', () => {
    const inv = buildInvestment({ initial_amount: '200', current_amount: '250' });
    expect(component.roi(inv)).toBeCloseTo(25);
  });

  it('roi() returns 0 when initial_amount is 0', () => {
    expect(component.roi(buildInvestment({ initial_amount: '0', current_amount: '100' }))).toBe(0);
  });

  it('gain() returns current minus initial', () => {
    const inv = buildInvestment({ initial_amount: '300', current_amount: '350' });
    expect(component.gain(inv)).toBeCloseTo(50);
  });

  // ── filteredInvestments ───────────────────────────────────────────────────

  it('filteredInvestments returns all when no filters', () => {
    component.investments = [buildInvestment(), buildInvestment({ id: 2, name: 'Tesla' })];
    expect(component.filteredInvestments.length).toBe(2);
  });

  it('filteredInvestments filters by searchQuery on name', () => {
    component.investments = [
      buildInvestment({ name: 'Apple' }),
      buildInvestment({ id: 2, name: 'Tesla' }),
    ];
    component.searchQuery = 'tesla';
    expect(component.filteredInvestments.length).toBe(1);
    expect(component.filteredInvestments[0].name).toBe('Tesla');
  });

  it('filteredInvestments filters by type', () => {
    component.investments = [
      buildInvestment({ type: 'Stocks' }),
      buildInvestment({ id: 2, type: 'Crypto' }),
    ];
    component.filterType = 'Crypto';
    expect(component.filteredInvestments.length).toBe(1);
    expect(component.filteredInvestments[0].type).toBe('Crypto');
  });

  it('filteredInvestments filters gainers only', () => {
    component.investments = [
      buildInvestment({ initial_amount: '100', current_amount: '120' }),  // gain
      buildInvestment({ id: 2, initial_amount: '100', current_amount: '80' }), // loss
    ];
    component.filterPerf = 'gain';
    expect(component.filteredInvestments.length).toBe(1);
  });

  it('filteredInvestments filters losers only', () => {
    component.investments = [
      buildInvestment({ initial_amount: '100', current_amount: '120' }),
      buildInvestment({ id: 2, initial_amount: '100', current_amount: '80' }),
    ];
    component.filterPerf = 'loss';
    expect(component.filteredInvestments.length).toBe(1);
  });

  // ── filteredPresetAssets ──────────────────────────────────────────────────

  it('filteredPresetAssets returns all 18 when no filter', () => {
    expect(component.filteredPresetAssets.length).toBe(18);
  });

  it('filteredPresetAssets filters by type tab', () => {
    component.assetFilterType = 'Crypto';
    const result = component.filteredPresetAssets;
    expect(result.every(a => a.type === 'Crypto')).toBe(true);
  });

  it('filteredPresetAssets filters by search text', () => {
    component.assetSearch = 'apple';
    const result = component.filteredPresetAssets;
    expect(result.length).toBe(1);
    expect(result[0].symbol).toBe('AAPL');
  });

  it('filteredPresetAssets combines type and search', () => {
    component.assetFilterType = 'ETF';
    component.assetSearch = 'voo';
    const result = component.filteredPresetAssets;
    expect(result.length).toBe(1);
    expect(result[0].symbol).toBe('VOO');
  });

  // ── pricePerUnitForDisplay / unitsForDisplay ───────────────────────────────

  it('pricePerUnitForDisplay returns empty when price_per_unit is 0', () => {
    component.investmentForm.patchValue({ price_per_unit: 0 });
    expect(component.pricePerUnitForDisplay).toBe('');
  });

  it('pricePerUnitForDisplay returns formatted string when price > 0', () => {
    component.investmentForm.patchValue({ price_per_unit: 200 });
    expect(component.pricePerUnitForDisplay).toBeTruthy();
  });

  it('unitsForDisplay returns "—" when no price set', () => {
    component.investmentForm.patchValue({ initial_amount: 1000, price_per_unit: 0 });
    expect(component.unitsForDisplay).toBe('—');
  });

  it('unitsForDisplay computes units from initial_amount / price', () => {
    component.investmentForm.patchValue({ initial_amount: 1000, price_per_unit: 200 });
    expect(component.unitsForDisplay).toBe('5.000000');
  });

  // ── sparklinePoints ───────────────────────────────────────────────────────

  it('sparklinePoints returns empty string for empty array', () => {
    expect(component.sparklinePoints([])).toBe('');
  });

  it('sparklinePoints returns a non-empty string for valid prices', () => {
    const result = component.sparklinePoints([100, 110, 105, 120]);
    expect(result).toContain(',');
    expect(result.split(' ').length).toBe(4);
  });

  it('sparklinePoints handles flat prices without division by zero', () => {
    const result = component.sparklinePoints([50, 50, 50]);
    expect(result).toBeTruthy();
  });

  // ── sparklineArea ─────────────────────────────────────────────────────────

  it('sparklineArea returns empty string for <2 prices', () => {
    expect(component.sparklineArea([])).toBe('');
    expect(component.sparklineArea([100])).toBe('');
  });

  it('sparklineArea starts with "0,40" and ends with "100,40"', () => {
    const result = component.sparklineArea([100, 110, 120]);
    expect(result.startsWith('0,40')).toBe(true);
    expect(result.endsWith('100,40')).toBe(true);
  });

  // ── formatPrice ───────────────────────────────────────────────────────────

  it('formatPrice: values >= 1000 have no decimals', () => {
    expect(component.formatPrice(1500)).not.toContain('.');
  });

  it('formatPrice: values between 1–999 have 2 decimals', () => {
    expect(component.formatPrice(12.5)).toContain('.');
  });

  it('formatPrice: values < 1 have 6 decimal places', () => {
    expect(component.formatPrice(0.000123)).toBe('0.000123');
  });

  // ── formatBigNum ──────────────────────────────────────────────────────────

  it('formatBigNum returns T suffix for trillions', () => {
    expect(component.formatBigNum(2e12)).toContain('T');
  });

  it('formatBigNum returns B suffix for billions', () => {
    expect(component.formatBigNum(3e9)).toContain('B');
  });

  it('formatBigNum returns M suffix for millions', () => {
    expect(component.formatBigNum(5e6)).toContain('M');
  });

  // ── applyQuote ────────────────────────────────────────────────────────────

  it('applyQuote() does nothing when quoteResult is null', () => {
    component.quoteResult = null;
    const before = component.investmentForm.get('name')?.value;
    component.applyQuote();
    expect(component.investmentForm.get('name')?.value).toBe(before);
  });

  it('applyQuote() patches name and type from quoteResult', () => {
    component.quoteResult = { name: 'Apple Inc', price: 200, currency: 'USD', exchange: 'NASDAQ', change_24h: 1.5, sparkline: [] };
    component.tickerSymbol = 'AAPL';
    component.investmentForm.patchValue({ type: '' });
    component.applyQuote();

    expect(component.investmentForm.get('name')?.value).toBe('Apple Inc');
    expect(component.investmentForm.get('type')?.value).toBe('Stocks');
  });

  it('applyQuote() sets type=Crypto for -USD symbols', () => {
    component.quoteResult = { name: 'Bitcoin', price: 60000, currency: 'USD', exchange: 'Crypto', change_24h: 2, sparkline: [] };
    component.tickerSymbol = 'BTC-USD';
    component.investmentForm.patchValue({ type: '' });
    component.applyQuote();

    expect(component.investmentForm.get('type')?.value).toBe('Crypto');
  });

  it('applyQuote() computes units when initial_amount is set', () => {
    component.quoteResult = { name: 'Apple Inc', price: 200, currency: 'USD', exchange: 'NASDAQ', change_24h: 0, sparkline: [] };
    component.tickerSymbol = 'AAPL';
    component.investmentForm.patchValue({ initial_amount: '1000', type: 'Stocks' });
    component.applyQuote();

    expect(component.investmentForm.get('units')?.value).toBeCloseTo(5);
    expect(component.investmentForm.get('current_amount')?.value).toBe('1000.00');
  });

  // ── prefillFromCoin ───────────────────────────────────────────────────────

  it('prefillFromCoin() sets showForm=true and patches name, type, price_per_unit', () => {
    const coin = { name: 'Ethereum', symbol: 'eth', current_price: 3500, price_change_percentage_24h: 1.2 };
    component.prefillFromCoin(coin);

    expect(component.showForm).toBe(true);
    expect(component.editingId).toBeNull();
    expect(component.investmentForm.get('name')?.value).toBe('Ethereum');
    expect(component.investmentForm.get('type')?.value).toBe('Crypto');
    expect(component.investmentForm.get('price_per_unit')?.value).toBe(3500);
  });

  // ── prefillFromStock ──────────────────────────────────────────────────────

  it('prefillFromStock() does nothing when stockQuote is null', () => {
    component.stockQuote = null;
    component.showForm = false;
    component.prefillFromStock();
    expect(component.showForm).toBe(false);
  });

  it('prefillFromStock() sets showForm=true and type=Stocks for non-ETF tickers', () => {
    component.stockQuote = { name: 'Apple Inc', price: 200, currency: 'USD', exchange: 'NASDAQ', change_24h: 1, sparkline: [], logo: null };
    component.stockSearch = 'AAPL';
    component.prefillFromStock();

    expect(component.showForm).toBe(true);
    expect(component.investmentForm.get('type')?.value).toBe('Stocks');
    expect(component.investmentForm.get('name')?.value).toBe('Apple Inc');
  });

  it('prefillFromStock() sets type=ETF for known ETF tickers', () => {
    component.stockQuote = { name: 'Vanguard S&P 500', price: 400, currency: 'USD', exchange: 'NYSE', change_24h: 0.5, sparkline: [], logo: null };
    component.stockSearch = 'VOO';
    component.prefillFromStock();

    expect(component.investmentForm.get('type')?.value).toBe('ETF');
  });

  // ── pickStockResult ───────────────────────────────────────────────────────

  it('pickStockResult() sets stockSearch and clears dropdown', () => {
    component.stockSearchResults = [{ symbol: 'MSFT', name: 'Microsoft', type: 'Stocks', exchange: 'NASDAQ' }];
    component.showStockDropdown = true;

    // prevent actual HTTP call
    vi.spyOn(component, 'fetchStockQuote').mockImplementation(() => {});
    component.pickStockResult({ symbol: 'MSFT', name: 'Microsoft', type: 'Stocks', exchange: 'NASDAQ' });

    expect(component.stockSearch).toBe('MSFT');
    expect(component.showStockDropdown).toBe(false);
    expect(component.stockSearchResults).toEqual([]);
  });

  // ── onStockSearchChange ───────────────────────────────────────────────────

  it('onStockSearchChange() clears results and dropdown immediately for short input', () => {
    component.stockSearchResults = [{ symbol: 'A', name: 'A', type: 'Stocks', exchange: 'X' }];
    component.showStockDropdown = true;
    component.onStockSearchChange('A'); // length < 2 → clears synchronously

    expect(component.stockSearchResults).toEqual([]);
    expect(component.showStockDropdown).toBe(false);
  });

  // ── typeIcon ──────────────────────────────────────────────────────────────

  it('typeIcon returns correct emoji for known types', () => {
    expect(component.typeIcon('Stocks')).toBe('📈');
    expect(component.typeIcon('ETF')).toBe('📊');
    expect(component.typeIcon('Crypto')).toBe('₿');
    expect(component.typeIcon('Real Estate')).toBe('🏠');
  });

  it('typeIcon returns 💼 for unknown types', () => {
    expect(component.typeIcon('Unknown')).toBe('💼');
  });

  // ── ngOnInit redirects unauthenticated users ──────────────────────────────

  it('ngOnInit() navigates to /login when not logged in', () => {
    mockAuth.isLoggedIn.mockReturnValueOnce(false);
    const router = TestBed.inject(Router);
    const spy = vi.spyOn(router, 'navigate');
    component.ngOnInit();
    expect(spy).toHaveBeenCalledWith(['/login']);
  });
});
