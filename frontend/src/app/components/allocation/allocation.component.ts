import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild, ChangeDetectionStrategy } from '@angular/core';
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
import { ChartInstance, RadialTooltipItem, chartConstructor } from '../../models/chart';

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
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, CurrencySymbolPipe],
  templateUrl: './allocation.component.html'
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

  private chartInstance: ChartInstance | null = null;
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

    this.chartInstance = new (chartConstructor())(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: 'transparent',
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
              label: (c: RadialTooltipItem) => {
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
