import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService } from '../../services/financial.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

const COLORS: Record<string, string> = {
  'savings_rate': '#3b82f6',
  'emergency_fund': '#14b8a6',
  'budget_adherence': '#8b5cf6',
  'debt_ratio': '#f59e0b',
  'investment_rate': '#10b981',
  'income_stability': '#ec4899',
};

const ICONS: Record<string, string> = {
  'savings_rate': '💰',
  'emergency_fund': '🛡️',
  'budget_adherence': '📋',
  'debt_ratio': '💳',
  'investment_rate': '📈',
  'income_stability': '📊',
};

@Component({
  selector: 'app-health-score',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto pt-14 lg:pt-0">
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <div>
                <h2 class="text-xl font-semibold">Financial Health Score</h2>
                <p class="text-primary-200 text-xs">A modular view of your financial wellbeing</p>
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

          <div *ngIf="isLoading && !data" class="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-pulse mb-5">
            <div class="lg:col-span-1 bg-white rounded-xl h-64 border border-gray-100"></div>
            <div class="lg:col-span-2 bg-white rounded-xl h-64 border border-gray-100"></div>
          </div>

          <ng-container *ngIf="data">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
              <!-- Score card -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
                <div class="relative w-40 h-40">
                  <svg class="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" stroke-width="10"/>
                    <circle cx="50" cy="50" r="45" fill="none" [attr.stroke]="scoreColor" stroke-width="10" stroke-linecap="round"
                      stroke-dasharray="283" [attr.stroke-dashoffset]="283 - (data.score.overall_score / 100) * 283"
                      transform="rotate(-90 50 50)"/>
                  </svg>
                  <div class="absolute inset-0 flex flex-col items-center justify-center">
                    <span class="text-3xl font-bold" [style.color]="scoreColor">{{ data.score.overall_score }}</span>
                    <span class="text-xs text-gray-400 uppercase tracking-wide">out of 100</span>
                  </div>
                </div>
                <p class="mt-4 text-sm font-medium text-gray-700">{{ scoreLabel }}</p>
                <p class="text-xs text-gray-400 mt-1">as of {{ data.score.as_of }}</p>
              </div>

              <!-- Category scores -->
              <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 class="text-sm font-semibold text-gray-700 mb-4">Category Scores</h3>
                <div class="space-y-3">
                  <div *ngFor="let cat of data.score.categories" class="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div class="flex items-center gap-3 mb-2">
                      <span class="text-lg">{{ iconFor(cat.key) }}</span>
                      <div class="flex-1">
                        <div class="flex justify-between items-center">
                          <span class="text-sm font-medium text-gray-800">{{ cat.name }}</span>
                          <span class="text-xs font-bold" [style.color]="colorFor(cat.key)">{{ cat.score }}/100</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div class="h-2 rounded-full transition-all duration-500"
                            [style.width.%]="cat.score"
                            [style.background-color]="colorFor(cat.key)"></div>
                        </div>
                      </div>
                      <span class="text-xs text-gray-400 w-16 text-right">{{ cat.weight }}%</span>
                    </div>
                    <p class="text-xs text-gray-500 pl-8">{{ cat.suggestion }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- History chart -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
              <h3 class="text-sm font-semibold text-gray-700 mb-3">6-Month Trend</h3>
              <div style="height: 200px; position: relative;">
                <canvas #historyChart></canvas>
              </div>
            </div>
          </ng-container>
        </div>
      </main>
    </div>
  `
})
export class HealthScoreComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('historyChart') chartRef!: ElementRef<HTMLCanvasElement>;

  data: any = null;
  isLoading = false;
  errorMessage = '';

  private chartInstance: any = null;
  private chartsReady = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private financialService: FinancialService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.load();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    if (this.data) this.renderChart();
  }

  ngOnDestroy(): void {
    this.chartInstance?.destroy();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.financialService.getHealthScore().subscribe({
      next: (d) => {
        this.data = d;
        this.isLoading = false;
        if (this.chartsReady) setTimeout(() => this.renderChart(), 50);
      },
      error: (e) => { this.errorMessage = e?.message || 'Failed to load health score'; this.isLoading = false; }
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
    if (s >= 80) return 'Excellent';
    if (s >= 60) return 'Good';
    if (s >= 40) return 'Fair';
    return 'Needs attention';
  }

  colorFor(key: string): string { return COLORS[key] ?? '#94a3b8'; }
  iconFor(key: string): string { return ICONS[key] ?? '📌'; }

  private renderChart(): void {
    if (!this.chartRef?.nativeElement || !this.data?.history?.length) return;
    const ctx = this.chartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.data.history.map((h: any) => h.month);
    const values = this.data.history.map((h: any) => h.score);

    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = values;
      this.chartInstance.update();
      return;
    }

    const gr = ctx.createLinearGradient(0, 0, 0, 200);
    gr.addColorStop(0, 'rgba(124,58,237,0.25)');
    gr.addColorStop(1, 'rgba(124,58,237,0.01)');

    this.chartInstance = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Health Score',
          data: values,
          borderColor: '#7c3aed',
          backgroundColor: gr,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#7c3aed',
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 10 } } }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.88)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: any) => ` Score: ${c.parsed.y}` }
          }
        }
      }
    });
  }
}
