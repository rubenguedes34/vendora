import {
  Component,
  OnInit,
  AfterViewChecked,
  OnDestroy,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, NetWorth } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { assetTypeLabel } from '../../models/investment';
import { monthLabel } from '../../utils/month-label';
import { LanguageService } from '../../services/language.service';
import {
  CartesianTooltipItem,
  ChartInstance,
  RadialTooltipItem,
  chartConstructor,
} from '../../models/chart';

const ALLOCATION_COLORS: Record<string, string> = {
  Cash: '#2dd4bf',
  Stocks: '#8b5cf6',
  ETF: '#3b82f6',
  Crypto: '#f59e0b',
  'Real Estate': '#10b981',
  Bonds: '#6366f1',
  'Savings Account': '#14b8a6',
  Other: '#94a3b8',
};

function allocationColor(type: string): string {
  return ALLOCATION_COLORS[type] ?? '#94a3b8';
}

@Component({
  selector: 'app-net-worth',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, SidebarComponent, CurrencySymbolPipe, TranslatePipe],
  templateUrl: './net-worth.component.html',
})
export class NetWorthComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('historyChart') historyChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('allocationChart') allocationChartRef!: ElementRef<HTMLCanvasElement>;

  data: NetWorth | null = null;
  isLoading = false;
  errorMessage = '';

  private translate = inject(TranslateService);
  languageService = inject(LanguageService);
  private destroyRef = inject(DestroyRef);
  private historyChartInstance: any = null;
  private allocationChartInstance: ChartInstance | null = null;
  private needsRender = false;

  constructor(
    private financialService: FinancialService,
    private authService: AuthService,
    private router: Router,
    public currencyService: CurrencyService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.languageService.language$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.data) this.needsRender = true;
    });
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
    this.data = null;
    this.needsRender = true;
    this.financialService.refreshNetWorth().subscribe({
      next: (d) => {
        this.data = d;
        this.isLoading = false;
        this.needsRender = true;
        this.cd.markForCheck();
      },
      error: (e) => {
        this.errorMessage = e?.message || this.translate.instant('netWorth.loadFailed');
        this.isLoading = false;
        this.cd.markForCheck();
      },
    });
  }

  typeLabel(type: string): string {
    return assetTypeLabel(this.translate, 'netWorth', type);
  }

  colorFor(type: string): string {
    return ALLOCATION_COLORS[type] ?? '#94a3b8';
  }

  monthLabel(label: string): string {
    return monthLabel(label, this.languageService.locale);
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

    const labels = this.data.history.map((h) => this.monthLabel(h.label));
    const nwData = this.data.history.map((h) => h.net_worth);
    const cashData = this.data.history.map((h) => h.cash);
    const investData = this.data.history.map((h) => h.investments);

    const mkGrad = (r: number, g: number, b: number) => {
      const gr = ctx.createLinearGradient(0, 0, 0, 220);
      gr.addColorStop(0, `rgba(${r},${g},${b},0.28)`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0.01)`);
      return gr;
    };

    if (this.historyChartInstance) {
      this.historyChartInstance.data.labels = labels;
      this.historyChartInstance.data.datasets[0].label = this.translate.instant('netWorth.title');
      this.historyChartInstance.data.datasets[1].label = this.translate.instant('netWorth.cash');
      this.historyChartInstance.data.datasets[2].label =
        this.translate.instant('netWorth.invested');
      this.historyChartInstance.data.datasets[0].data = nwData;
      this.historyChartInstance.data.datasets[1].data = cashData;
      this.historyChartInstance.data.datasets[2].data = investData;
      this.historyChartInstance.update();
      return;
    }

    this.historyChartInstance = new (chartConstructor())(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: this.translate.instant('netWorth.title'),
            data: nwData,
            borderColor: '#7c3aed',
            backgroundColor: mkGrad(124, 58, 237),
            borderWidth: 2.5,
            pointRadius: 3,
            pointBackgroundColor: '#7c3aed',
            tension: 0.4,
            fill: true,
            order: 1,
          },
          {
            label: this.translate.instant('netWorth.cash'),
            data: cashData,
            borderColor: '#2dd4bf',
            backgroundColor: mkGrad(45, 212, 191),
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: '#2dd4bf',
            tension: 0.4,
            fill: true,
            order: 2,
          },
          {
            label: this.translate.instant('netWorth.invested'),
            data: investData,
            borderColor: '#a78bfa',
            backgroundColor: mkGrad(167, 139, 250),
            borderWidth: 2,
            pointRadius: 2,
            pointBackgroundColor: '#a78bfa',
            tension: 0.4,
            fill: true,
            order: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.88)',
            titleColor: '#e5e7eb',
            bodyColor: '#d1d5db',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (c: CartesianTooltipItem) => {
                const sym = this.currencyService.symbol;
                return ` ${c.dataset.label}: ${sym}${Number(c.parsed.y).toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: {
              color: '#9ca3af',
              font: { size: 10 },
              callback: (v: number | string) =>
                `${this.currencyService.symbol}${Number(v).toLocaleString(this.languageService.locale)}`,
            },
          },
        },
      },
    });
  }

  private renderAllocationChart(): void {
    if (!this.allocationChartRef?.nativeElement || !this.data?.allocation.length) return;
    const ctx = this.allocationChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.data.allocation.map((a) => this.typeLabel(a.type));
    const values = this.data.allocation.map((a) => a.value);
    const colors = this.data.allocation.map((a) => allocationColor(a.type));

    if (this.allocationChartInstance) {
      this.allocationChartInstance.data.labels = labels;
      this.allocationChartInstance.data.datasets[0].data = values;
      this.allocationChartInstance.data.datasets[0].backgroundColor = colors;
      this.allocationChartInstance.update();
      return;
    }

    this.allocationChartInstance = new (chartConstructor())(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: 'transparent',
            borderWidth: 2,
            hoverOffset: 6,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.88)',
            titleColor: '#e5e7eb',
            bodyColor: '#d1d5db',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (c: RadialTooltipItem) => {
                const sym = this.currencyService.symbol;
                return ` ${c.label}: ${sym}${Number(c.parsed).toFixed(2)}`;
              },
            },
          },
        },
      },
    });
  }
}
