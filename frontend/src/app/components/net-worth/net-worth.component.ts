import { Component, OnInit, AfterViewChecked, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, NetWorth } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';

const ALLOCATION_COLORS: Record<string, string> = {
  'Cash':            '#2dd4bf',
  'Stocks':          '#8b5cf6',
  'ETF':             '#3b82f6',
  'Crypto':          '#f59e0b',
  'Real Estate':     '#10b981',
  'Bonds':           '#6366f1',
  'Savings Account': '#14b8a6',
  'Other':           '#94a3b8',
};

function allocationColor(type: string): string {
  return ALLOCATION_COLORS[type] ?? '#94a3b8';
}

@Component({
  selector: 'app-net-worth',
  standalone: true,
  imports: [CommonModule, SidebarComponent, CurrencySymbolPipe],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto pt-14 lg:pt-0">
        <!-- Header -->
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <div>
                <h2 class="text-xl font-semibold">Net Worth</h2>
                <p class="text-primary-200 text-xs">Your complete financial picture</p>
              </div>
              <button (click)="load()" [disabled]="isLoading"
                class="flex items-center gap-1.5 text-xs bg-primary-600 hover:bg-primary-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                <svg class="w-3.5 h-3.5" [class.animate-spin]="isLoading" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          <!-- Error -->
          <div *ngIf="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {{ errorMessage }}
          </div>

          <!-- Loading skeleton -->
          <div *ngIf="isLoading && !data" class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 animate-pulse">
            <div *ngFor="let i of [1,2,3,4]" class="bg-white rounded-xl h-20 border border-gray-100"></div>
          </div>

          <ng-container *ngIf="data">

            <!-- Summary Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">

              <!-- Net Worth -->
              <div class="col-span-2 md:col-span-1 bg-white px-4 py-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-primary-500">
                <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Net Worth</p>
                <p class="text-xl font-bold text-primary-700">{{ data.net_worth | currencySymbol }}</p>
                <div class="mt-1 flex items-center gap-1 text-xs"
                  [class.text-green-500]="data.monthly_change >= 0"
                  [class.text-red-500]="data.monthly_change < 0">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      [attr.d]="data.monthly_change >= 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'"/>
                  </svg>
                  <span>{{ data.monthly_change | currencySymbol }} this month</span>
                </div>
              </div>

              <!-- Cash Balance -->
              <div class="bg-white px-4 py-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-teal-400">
                <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Cash Balance</p>
                <p class="text-base font-bold" [class.text-teal-600]="data.cash_balance >= 0" [class.text-red-500]="data.cash_balance < 0">
                  {{ data.cash_balance | currencySymbol }}
                </p>
                <p class="text-xs text-gray-400 mt-1">Income − Expenses</p>
              </div>

              <!-- Investments -->
              <div class="bg-white px-4 py-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-violet-400">
                <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Investments</p>
                <p class="text-base font-bold text-violet-600">{{ data.investment_value | currencySymbol }}</p>
                <p class="text-xs mt-1"
                  [class.text-green-500]="data.investment_gain >= 0"
                  [class.text-red-500]="data.investment_gain < 0">
                  {{ data.investment_gain >= 0 ? '+' : '' }}{{ data.investment_gain | currencySymbol }}
                  ({{ data.investment_roi >= 0 ? '+' : '' }}{{ data.investment_roi.toFixed(1) }}%)
                </p>
              </div>

              <!-- Yearly Change -->
              <div class="bg-white px-4 py-4 rounded-xl shadow-sm border border-gray-100 border-l-4"
                [class.border-l-green-400]="data.yearly_change >= 0"
                [class.border-l-red-400]="data.yearly_change < 0">
                <p class="text-xs text-gray-400 uppercase tracking-wide mb-1">Year-to-date</p>
                <p class="text-base font-bold"
                  [class.text-green-600]="data.yearly_change >= 0"
                  [class.text-red-600]="data.yearly_change < 0">
                  {{ data.yearly_change >= 0 ? '+' : '' }}{{ data.yearly_change | currencySymbol }}
                </p>
                <p class="text-xs text-gray-400 mt-1">Net this year</p>
              </div>
            </div>

            <!-- Charts row -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">

              <!-- History chart (2/3 width) -->
              <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-sm font-semibold text-gray-700">Net Worth History</h3>
                  <div class="flex items-center gap-3 text-xs text-gray-400">
                    <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-primary-500 rounded"></span>Total</span>
                    <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-teal-400 rounded"></span>Cash</span>
                    <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-violet-400 rounded"></span>Invested</span>
                  </div>
                </div>
                <div style="height: 220px; position: relative;">
                  <canvas #historyChart></canvas>
                </div>
              </div>

              <!-- Allocation chart (1/3 width) -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">Asset Allocation</h3>
                <div *ngIf="data.allocation.length === 0" class="flex flex-col items-center justify-center h-40 text-gray-300">
                  <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
                  </svg>
                  <p class="text-xs">No assets yet</p>
                </div>
                <div *ngIf="data.allocation.length > 0">
                  <div style="height: 160px; position: relative;">
                    <canvas #allocationChart></canvas>
                  </div>
                  <!-- Legend -->
                  <div class="mt-3 space-y-1.5">
                    <div *ngFor="let item of data.allocation" class="flex items-center justify-between text-xs">
                      <div class="flex items-center gap-2">
                        <span class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          [style.background-color]="colorFor(item.type)"></span>
                        <span class="text-gray-600">{{ item.type }}</span>
                      </div>
                      <span class="font-medium text-gray-700">{{ item.value | currencySymbol }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Breakdown table -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-4">Breakdown</h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div class="p-4 bg-teal-50 rounded-xl border border-teal-100">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"/>
                    </svg>
                    <span class="text-xs font-semibold text-teal-700 uppercase tracking-wide">Cash & Transactions</span>
                  </div>
                  <div class="space-y-1 text-sm">
                    <div class="flex justify-between"><span class="text-gray-500">Total income</span><span class="font-medium text-green-600">+{{ data.total_income | currencySymbol }}</span></div>
                    <div class="flex justify-between"><span class="text-gray-500">Total expenses</span><span class="font-medium text-red-500">−{{ data.total_expenses | currencySymbol }}</span></div>
                    <div class="flex justify-between border-t border-teal-200 pt-1 mt-1"><span class="font-semibold text-gray-700">Balance</span><span class="font-bold" [class.text-teal-600]="data.cash_balance >= 0" [class.text-red-600]="data.cash_balance < 0">{{ data.cash_balance | currencySymbol }}</span></div>
                  </div>
                </div>

                <div class="p-4 bg-violet-50 rounded-xl border border-violet-100">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                    </svg>
                    <span class="text-xs font-semibold text-violet-700 uppercase tracking-wide">Investments</span>
                  </div>
                  <div class="space-y-1 text-sm">
                    <div class="flex justify-between"><span class="text-gray-500">Cost basis</span><span class="font-medium text-gray-700">{{ data.investment_cost | currencySymbol }}</span></div>
                    <div class="flex justify-between"><span class="text-gray-500">Current value</span><span class="font-medium text-violet-600">{{ data.investment_value | currencySymbol }}</span></div>
                    <div class="flex justify-between border-t border-violet-200 pt-1 mt-1">
                      <span class="font-semibold text-gray-700">Gain/Loss</span>
                      <span class="font-bold" [class.text-green-600]="data.investment_gain >= 0" [class.text-red-600]="data.investment_gain < 0">
                        {{ data.investment_gain >= 0 ? '+' : '' }}{{ data.investment_gain | currencySymbol }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="p-4 bg-primary-50 rounded-xl border border-primary-100">
                  <div class="flex items-center gap-2 mb-2">
                    <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    <span class="text-xs font-semibold text-primary-700 uppercase tracking-wide">Summary</span>
                  </div>
                  <div class="space-y-1 text-sm">
                    <div class="flex justify-between"><span class="text-gray-500">This month</span>
                      <span class="font-medium" [class.text-green-600]="data.monthly_change >= 0" [class.text-red-500]="data.monthly_change < 0">
                        {{ data.monthly_change >= 0 ? '+' : '' }}{{ data.monthly_change | currencySymbol }}
                      </span>
                    </div>
                    <div class="flex justify-between"><span class="text-gray-500">This year</span>
                      <span class="font-medium" [class.text-green-600]="data.yearly_change >= 0" [class.text-red-500]="data.yearly_change < 0">
                        {{ data.yearly_change >= 0 ? '+' : '' }}{{ data.yearly_change | currencySymbol }}
                      </span>
                    </div>
                    <div class="flex justify-between border-t border-primary-200 pt-1 mt-1">
                      <span class="font-semibold text-gray-700">Net Worth</span>
                      <span class="font-bold text-primary-700">{{ data.net_worth | currencySymbol }}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </ng-container>
        </div>
      </main>
    </div>
  `
})
export class NetWorthComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('historyChart')    historyChartRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('allocationChart') allocationChartRef!: ElementRef<HTMLCanvasElement>;

  data: NetWorth | null = null;
  isLoading = false;
  errorMessage = '';

  private historyChartInstance:    any = null;
  private allocationChartInstance: any = null;
  private needsRender = false;

  constructor(
    private financialService: FinancialService,
    private authService: AuthService,
    private router: Router,
    public currencyService: CurrencyService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.load();
  }

  ngAfterViewChecked(): void {
    this.renderIfReady();
  }

  ngOnDestroy(): void {
    this.historyChartInstance?.destroy();
    this.allocationChartInstance?.destroy();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.financialService.getNetWorth().subscribe({
      next: (d) => {
        this.data = d;
        this.isLoading = false;
        this.needsRender = true;
      },
      error: (e) => { this.errorMessage = e?.message || 'Failed to load net worth'; this.isLoading = false; }
    });
  }

  colorFor(type: string): string {
    return ALLOCATION_COLORS[type] ?? '#94a3b8';
  }

  private renderIfReady(): void {
    if (!this.needsRender || !this.data) return;
    if (!this.historyChartRef?.nativeElement) return;
    if (this.data.allocation.length > 0 && !this.allocationChartRef?.nativeElement) return;

    this.renderCharts();
    this.needsRender = false;
  }

  private renderCharts(): void {
    this.renderHistoryChart();
    this.renderAllocationChart();
  }

  private renderHistoryChart(): void {
    if (!this.historyChartRef?.nativeElement || !this.data) return;
    const ctx = this.historyChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels      = this.data.history.map(h => h.label);
    const nwData      = this.data.history.map(h => h.net_worth);
    const cashData    = this.data.history.map(h => h.cash);
    const investData  = this.data.history.map(h => h.investments);

    const mkGrad = (r: number, g: number, b: number) => {
      const gr = ctx.createLinearGradient(0, 0, 0, 220);
      gr.addColorStop(0, `rgba(${r},${g},${b},0.28)`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0.01)`);
      return gr;
    };

    if (this.historyChartInstance) {
      this.historyChartInstance.data.labels = labels;
      this.historyChartInstance.data.datasets[0].data = nwData;
      this.historyChartInstance.data.datasets[1].data = cashData;
      this.historyChartInstance.data.datasets[2].data = investData;
      this.historyChartInstance.update();
      return;
    }

    this.historyChartInstance = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Worth',
            data: nwData,
            borderColor: '#7c3aed', backgroundColor: mkGrad(124,58,237),
            borderWidth: 2.5, pointRadius: 3, pointBackgroundColor: '#7c3aed',
            tension: 0.4, fill: true, order: 1,
          },
          {
            label: 'Cash',
            data: cashData,
            borderColor: '#2dd4bf', backgroundColor: mkGrad(45,212,191),
            borderWidth: 2, pointRadius: 2, pointBackgroundColor: '#2dd4bf',
            tension: 0.4, fill: true, order: 2,
          },
          {
            label: 'Invested',
            data: investData,
            borderColor: '#a78bfa', backgroundColor: mkGrad(167,139,250),
            borderWidth: 2, pointRadius: 2, pointBackgroundColor: '#a78bfa',
            tension: 0.4, fill: true, order: 3,
          },
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.88)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: {
              label: (c: any) => {
                const sym = this.currencyService.symbol;
                return ` ${c.dataset.label}: ${sym}${Number(c.parsed.y).toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              color: '#9ca3af', font: { size: 10 },
              callback: (v: any) => `${this.currencyService.symbol}${Number(v).toLocaleString()}`
            }
          }
        }
      }
    });
  }

  private renderAllocationChart(): void {
    if (!this.allocationChartRef?.nativeElement || !this.data?.allocation.length) return;
    const ctx = this.allocationChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.data.allocation.map(a => a.type);
    const values = this.data.allocation.map(a => a.value);
    const colors = this.data.allocation.map(a => allocationColor(a.type));

    if (this.allocationChartInstance) {
      this.allocationChartInstance.data.labels = labels;
      this.allocationChartInstance.data.datasets[0].data = values;
      this.allocationChartInstance.data.datasets[0].backgroundColor = colors;
      this.allocationChartInstance.update();
      return;
    }

    this.allocationChartInstance = new (window as any).Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6,
          borderRadius: 3,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.88)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: {
              label: (c: any) => {
                const sym = this.currencyService.symbol;
                return ` ${c.label}: ${sym}${Number(c.parsed).toFixed(2)}`;
              }
            }
          }
        }
      }
    });
  }
}
