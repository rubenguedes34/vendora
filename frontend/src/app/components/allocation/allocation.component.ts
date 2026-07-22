import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CurrencyService } from '../../services/currency.service';
import { FinancialService, PortfolioAllocation, AllocationBreakdown } from '../../services/financial.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';

const COLORS: Record<string, string> = {
  'Stocks': '#3b82f6',
  'ETF':    '#f97316',
  'Crypto': '#eab308',
  'Bonds':  '#8b5cf6',
  'Cash':   '#14b8a6',
  'Other':  '#94a3b8',
};

@Component({
  selector: 'app-allocation',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, CurrencySymbolPipe],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto pt-14 lg:pt-0 pb-20 lg:pb-0">
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex flex-col sm:flex-row justify-between h-auto sm:h-16 py-3 sm:py-0 items-start sm:items-center gap-3">
              <div>
                <h2 class="text-xl font-semibold">Portfolio Allocation</h2>
                <p class="text-primary-200 text-xs">Breakdown by asset type and filters</p>
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
          <div *ngIf="errorMessage" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {{ errorMessage }}
          </div>

          <!-- Filters -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Asset type</label>
                <select [(ngModel)]="filterType" (change)="onFilterChange()"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white">
                  <option value="">All types</option>
                  <option value="Stocks">Stocks</option>
                  <option value="ETF">ETF</option>
                  <option value="Crypto">Crypto</option>
                  <option value="Bonds">Bonds</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">Account</label>
                <input [(ngModel)]="filterAccount" (ngModelChange)="accountSubject.next($event)"
                  type="text" placeholder="Filter by account"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input [(ngModel)]="filterDateFrom" (change)="onFilterChange()"
                  type="date" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input [(ngModel)]="filterDateTo" (change)="onFilterChange()"
                  type="date" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white" />
              </div>
            </div>
          </div>

          <div *ngIf="isLoading && !data" class="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse">
            <div class="lg:col-span-1 bg-white rounded-xl h-72 border border-gray-100"></div>
            <div class="lg:col-span-2 bg-white rounded-xl h-72 border border-gray-100"></div>
          </div>

          <ng-container *ngIf="data">
            <!-- Empty state -->
            <div *ngIf="data.breakdown.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/>
              </svg>
              <p class="text-gray-500 font-medium">No investments match the selected filters.</p>
              <button (click)="clearFilters()" class="mt-3 text-xs text-primary-600 hover:text-primary-800 font-medium">Clear filters</button>
            </div>

            <div *ngIf="data.breakdown.length > 0" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <!-- Pie chart -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">Allocation</h3>
                <div style="height: 220px; position: relative;">
                  <canvas #allocationChart></canvas>
                </div>
                <div class="mt-4 text-center">
                  <p class="text-xs text-gray-400 uppercase tracking-wide">Total invested</p>
                  <p class="text-xl font-bold text-primary-700">{{ data.total | currencySymbol }}</p>
                </div>
              </div>

              <!-- Breakdown -->
              <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">Breakdown</h3>
                <div class="space-y-3">
                  <div *ngFor="let item of data.breakdown" class="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      [style.background-color]="colorFor(item.type)">
                      {{ item.type.slice(0,1) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex justify-between items-center mb-1">
                        <span class="font-medium text-gray-800">{{ item.type }}</span>
                        <span class="font-semibold text-gray-800">{{ item.total | currencySymbol }}</span>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full transition-all duration-500"
                          [style.width.%]="item.percentage"
                          [style.background-color]="colorFor(item.type)"></div>
                      </div>
                      <div class="flex justify-between items-center mt-1 text-xs text-gray-500">
                        <span>{{ item.percentage.toFixed(1) }}%</span>
                        <span>{{ item.count }} asset{{ item.count !== 1 ? 's' : '' }}</span>
                      </div>
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
export class AllocationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('allocationChart') chartRef!: ElementRef<HTMLCanvasElement>;

  data: PortfolioAllocation | null = null;
  isLoading = false;
  errorMessage = '';

  filterType = '';
  filterAccount = '';
  filterDateFrom = '';
  filterDateTo = '';

  private chartInstance: any = null;
  private chartsReady = false;
  private destroy$ = new Subject<void>();
  accountSubject = new Subject<string>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private financialService: FinancialService,
    public currencyService: CurrencyService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }

    this.accountSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(() => this.load());

    this.load();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    if (this.data) this.renderChart();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chartInstance?.destroy();
  }

  onFilterChange(): void { this.load(); }

  clearFilters(): void {
    this.filterType = '';
    this.filterAccount = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.financialService.getAllocation({
      type: this.filterType || undefined,
      account: this.filterAccount.trim() || undefined,
      date_from: this.filterDateFrom || undefined,
      date_to: this.filterDateTo || undefined,
    }).subscribe({
      next: (d) => {
        this.data = d;
        this.isLoading = false;
        if (this.chartsReady) setTimeout(() => this.renderChart(), 50);
      },
      error: (e) => { this.errorMessage = e?.message || 'Failed to load allocation'; this.isLoading = false; }
    });
  }

  colorFor(type: string): string {
    return COLORS[type] ?? '#94a3b8';
  }

  private renderChart(): void {
    if (!this.chartRef?.nativeElement || !this.data?.breakdown.length) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.data.breakdown.map(b => b.type);
    const values = this.data.breakdown.map(b => b.total);
    const colors = this.data.breakdown.map(b => this.colorFor(b.type));

    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = values;
      this.chartInstance.data.datasets[0].backgroundColor = colors;
      this.chartInstance.update();
      return;
    }

    this.chartInstance = new (window as any).Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 }, color: '#4b5563' } },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.88)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: {
              label: (c: any) => {
                const sym = this.currencyService.symbol;
                const item: AllocationBreakdown = this.data!.breakdown[c.dataIndex];
                return ` ${item.type}: ${sym}${item.total.toFixed(2)} (${item.percentage.toFixed(1)}%)`;
              }
            }
          }
        }
      }
    });
  }
}
