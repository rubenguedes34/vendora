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
import { monthLabel } from '../../utils/month-label';
import { LanguageService } from '../../services/language.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService } from '../../services/financial.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { HealthScore, HealthScoreCategory } from '../../models/health-score';
import { CartesianTooltipItem, ChartInstance, chartConstructor } from '../../models/chart';

const COLORS: Record<string, string> = {
  savings_rate: '#3b82f6',
  emergency_fund: '#14b8a6',
  budget_adherence: '#8b5cf6',
  debt_ratio: '#f59e0b',
  investment_rate: '#10b981',
  income_stability: '#ec4899',
};

const ICONS: Record<string, string> = {
  savings_rate: '💰',
  emergency_fund: '🛡️',
  budget_adherence: '📋',
  debt_ratio: '💳',
  investment_rate: '📈',
  income_stability: '📊',
};

@Component({
  selector: 'app-health-score',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, SidebarComponent, TranslatePipe],
  templateUrl: './health-score.component.html',
})
export class HealthScoreComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('historyChart') chartRef!: ElementRef<HTMLCanvasElement>;

  data: HealthScore | null = null;
  isLoading = false;
  errorMessage = '';

  private chartInstance: ChartInstance | null = null;
  private needsRender = false;
  private destroyRef = inject(DestroyRef);

  constructor(
    private authService: AuthService,
    private router: Router,
    private financialService: FinancialService,
    private cd: ChangeDetectorRef,
    private translate: TranslateService,
    public languageService: LanguageService,
  ) {
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (!this.chartInstance) return;
      this.chartInstance.destroy();
      this.chartInstance = null;
      this.needsRender = true;
      this.cd.markForCheck();
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.load();
  }

  ngAfterViewChecked(): void {
    this.renderIfReady();
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.data = null;
    this.needsRender = true;
    this.financialService.refreshHealthScore().subscribe({
      next: (d) => {
        this.data = d;
        this.isLoading = false;
        this.needsRender = true;
        this.cd.markForCheck();
      },
      error: (e) => {
        this.errorMessage = e?.message || this.translate.instant('health.loadError');
        this.isLoading = false;
        this.cd.markForCheck();
      },
    });
  }

  get scoreColor(): string {
    const s = this.data?.score?.overall_score ?? 0;
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#f59e0b';
    return '#ef4444';
  }

  get scoreLabel(): string {
    const s = this.data?.score?.overall_score ?? 0;
    if (s >= 80) return this.translate.instant('health.labels.excellent');
    if (s >= 60) return this.translate.instant('health.labels.good');
    if (s >= 40) return this.translate.instant('health.labels.fair');
    return this.translate.instant('health.labels.attention');
  }

  textFor(key: string, fallback: string): string {
    const k = `health.${key}`;
    const t = this.translate.instant(k);
    return t === k ? fallback : t;
  }

  suggestionFor(cat: HealthScoreCategory): string {
    if (!cat.suggestion_key) return cat.suggestion;
    let key = `suggestions.${cat.suggestion_key}`;
    if (cat.suggestion_key === 'budget_adherence_exceeded') {
      key += cat.suggestion_params?.['count'] === 1 ? '_one' : '_other';
    }
    const k = `health.${key}`;
    const t = this.translate.instant(k, cat.suggestion_params);
    return t === k ? cat.suggestion : t;
  }

  colorFor(key: string): string {
    return COLORS[key] ?? '#94a3b8';
  }
  iconFor(key: string): string {
    return ICONS[key] ?? '📌';
  }

  private renderIfReady(): void {
    if (!this.needsRender || !this.data) return;
    if (!this.chartRef?.nativeElement) return;

    this.renderChart();
    this.needsRender = false;
  }

  private renderChart(): void {
    if (!this.chartRef?.nativeElement || !this.data?.history?.length) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.data.history.map((h) => monthLabel(h.month, this.languageService.locale));
    const values = this.data.history.map((h) => h.score);

    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = values;
      this.chartInstance.update();
      return;
    }

    const gr = ctx.createLinearGradient(0, 0, 0, 200);
    gr.addColorStop(0, 'rgba(124,58,237,0.25)');
    gr.addColorStop(1, 'rgba(124,58,237,0.01)');

    this.chartInstance = new (chartConstructor())(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: this.translate.instant('health.chartLabel'),
            data: values,
            borderColor: '#7c3aed',
            backgroundColor: gr,
            borderWidth: 2.5,
            pointRadius: 4,
            pointBackgroundColor: '#7c3aed',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#9ca3af', font: { size: 10 } },
          },
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.88)',
            titleColor: '#e5e7eb',
            bodyColor: '#d1d5db',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (c: CartesianTooltipItem) =>
                this.translate.instant('health.tooltipScore', { score: c.parsed.y }),
            },
          },
        },
      },
    });
  }
}
