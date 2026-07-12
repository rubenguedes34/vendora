import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, FinancialRecord } from '../../services/financial.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <!-- Main Content -->
      <main class="flex-1 overflow-auto">
        <!-- Header -->
        <header class="bg-teal-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <div>
                <h2 class="text-xl font-semibold">Dashboard</h2>
                <p class="text-teal-200 text-xs">Welcome back, {{ user?.name }}!</p>
              </div>
              <span class="text-sm text-teal-200">{{ monthNames[currentMonth - 1] }} {{ currentYear }}</span>
            </div>
          </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          <!-- Quick Actions (top) -->
          <div class="flex flex-wrap gap-3 mb-6">
            <a routerLink="/budgets"
              class="flex items-center gap-2 bg-teal-500 text-white py-2 px-4 rounded-md hover:bg-teal-600 transition-colors text-sm font-semibold shadow">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Budgets
            </a>
            <a routerLink="/transactions"
              class="flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-semibold shadow">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
              </svg>
              Transactions
            </a>
            <a routerLink="/recurrent-transactions"
              class="flex items-center gap-2 bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-600 transition-colors text-sm font-semibold shadow">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Recurrent
            </a>
            <a routerLink="/investments"
              class="flex items-center gap-2 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors text-sm font-semibold shadow">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
              Investments
            </a>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Income</h3>
              <p class="text-2xl font-bold text-blue-600">€{{ formatCurrency(monthlyIncome) }}</p>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-red-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Expenses</h3>
              <p class="text-2xl font-bold text-red-600">€{{ formatCurrency(monthlyExpenses) }}</p>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Savings</h3>
              <p class="text-2xl font-bold text-green-600">€{{ formatCurrency(monthlySavings) }}</p>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-teal-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Balance</h3>
              <p class="text-2xl font-bold text-teal-600">€{{ formatCurrency(totalBalance) }}</p>
            </div>
          </div>

          <!-- Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Income vs Expenses vs Savings - yearly bar chart -->
            <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-lg font-semibold text-gray-800 mb-1">Income vs Expenses vs Savings</h3>
              <p class="text-xs text-gray-400 mb-4">Full year {{ currentYear }}</p>
              <div *ngIf="yearlyRecords.length === 0" class="text-gray-400 text-center py-12 text-sm">
                No yearly data yet
              </div>
              <canvas #incomeExpenseChart></canvas>
            </div>

            <!-- Monthly Overview doughnut with navigation -->
            <div class="bg-white p-6 rounded-lg shadow-md">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-800">Monthly Overview</h3>
                <div class="flex items-center space-x-2">
                  <button (click)="prevMonth()"
                    class="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>
                  <span class="text-sm font-medium text-gray-700 w-28 text-center">
                    {{ monthNames[overviewMonth - 1] }} {{ overviewYear }}
                  </span>
                  <button (click)="nextMonth()"
                    class="p-1 rounded hover:bg-gray-100 text-gray-600 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Mini stats for the overview month -->
              <div class="grid grid-cols-3 gap-2 mb-4 text-center text-xs">
                <div class="bg-blue-50 rounded p-2">
                  <p class="text-gray-500">Income</p>
                  <p class="font-bold text-blue-600">€{{ formatCurrency(overviewIncome) }}</p>
                </div>
                <div class="bg-red-50 rounded p-2">
                  <p class="text-gray-500">Expenses</p>
                  <p class="font-bold text-red-600">€{{ formatCurrency(overviewExpenses) }}</p>
                </div>
                <div class="bg-green-50 rounded p-2">
                  <p class="text-gray-500">Savings</p>
                  <p class="font-bold text-green-600">€{{ formatCurrency(overviewSavings) }}</p>
                </div>
              </div>
              <canvas #categoryChart></canvas>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit {
  user: any = null;
  totalBalance = 0;
  monthlyIncome = 0;
  monthlyExpenses = 0;
  monthlySavings = 0;
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  yearlyRecords: FinancialRecord[] = [];

  overviewYear = new Date().getFullYear();
  overviewMonth = new Date().getMonth() + 1;
  overviewIncome = 0;
  overviewExpenses = 0;
  overviewSavings = 0;

  @ViewChild('incomeExpenseChart') incomeExpenseChart!: ElementRef;
  @ViewChild('categoryChart') categoryChart!: ElementRef;

  private incomeExpenseChartInstance: any;
  private categoryChartInstance: any;

  constructor(
    private authService: AuthService,
    private financialService: FinancialService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.getUserObservable().subscribe(user => {
      this.user = user;
      if (user?.current_year) this.currentYear = user.current_year;
      if (user?.current_month) this.currentMonth = user.current_month;
    });

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.financialService.getCurrentRecord().subscribe({
      next: (record) => {
        this.monthlyIncome = parseFloat(String(record.monthly_income || 0));
        this.monthlyExpenses = parseFloat(String(record.monthly_expenses || 0));
        this.monthlySavings = parseFloat(String(record.savings || 0));
        this.totalBalance = this.monthlyIncome - this.monthlyExpenses;
        this.updateOverviewFromRecord(record);
        this.updateChartsWithRealData();
      },
      error: () => this.updateChartsWithRealData()
    });

    this.financialService.getYearRecords(this.currentYear).subscribe({
      next: (records) => {
        this.yearlyRecords = records;
        this.updateChartsWithRealData();
      },
      error: () => { this.yearlyRecords = []; }
    });
  }

  updateOverviewFromRecord(record: FinancialRecord): void {
    this.overviewIncome = parseFloat(String(record.monthly_income || 0));
    this.overviewExpenses = parseFloat(String(record.monthly_expenses || 0));
    this.overviewSavings = parseFloat(String(record.savings || 0));
    this.updateOverviewChart();
  }

  prevMonth(): void {
    if (this.overviewMonth === 1) { this.overviewMonth = 12; this.overviewYear--; }
    else { this.overviewMonth--; }
    this.loadOverviewMonth();
  }

  nextMonth(): void {
    if (this.overviewMonth === 12) { this.overviewMonth = 1; this.overviewYear++; }
    else { this.overviewMonth++; }
    this.loadOverviewMonth();
  }

  loadOverviewMonth(): void {
    const record = this.yearlyRecords.find(r => r.year === this.overviewYear && r.month === this.overviewMonth);
    if (record) {
      this.updateOverviewFromRecord(record);
    } else {
      this.financialService.getYearRecords(this.overviewYear).subscribe({
        next: (records) => {
          const r = records.find(rec => rec.month === this.overviewMonth);
          if (r) { this.updateOverviewFromRecord(r); }
          else { this.overviewIncome = 0; this.overviewExpenses = 0; this.overviewSavings = 0; this.updateOverviewChart(); }
        },
        error: () => { this.overviewIncome = 0; this.overviewExpenses = 0; this.overviewSavings = 0; this.updateOverviewChart(); }
      });
    }
  }

  formatCurrency(value: any): string {
    return (parseFloat(value) || 0).toFixed(2);
  }

  updateChartsWithRealData(): void {
    if (this.incomeExpenseChartInstance && this.yearlyRecords.length > 0) {
      const labels = this.yearlyRecords.map(r => this.monthNames[r.month - 1].slice(0, 3));
      this.incomeExpenseChartInstance.data.labels = labels;
      this.incomeExpenseChartInstance.data.datasets[0].data = this.yearlyRecords.map(r => parseFloat(String(r.monthly_income)) || 0);
      this.incomeExpenseChartInstance.data.datasets[1].data = this.yearlyRecords.map(r => parseFloat(String(r.monthly_expenses)) || 0);
      this.incomeExpenseChartInstance.data.datasets[2].data = this.yearlyRecords.map(r => parseFloat(String(r.savings)) || 0);
      this.incomeExpenseChartInstance.update();
    }
    this.updateOverviewChart();
  }

  updateOverviewChart(): void {
    if (this.categoryChartInstance) {
      this.categoryChartInstance.data.datasets[0].data = [
        this.overviewIncome, this.overviewExpenses, Math.max(0, this.overviewSavings)
      ];
      this.categoryChartInstance.update();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initIncomeExpenseChart();
      this.initCategoryChart();
    }, 200);
  }

  initIncomeExpenseChart(): void {
    if (!this.incomeExpenseChart?.nativeElement) return;
    const ctx = this.incomeExpenseChart.nativeElement.getContext('2d');
    this.incomeExpenseChartInstance = new (window as any).Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.yearlyRecords.map(r => this.monthNames[r.month - 1].slice(0, 3)),
        datasets: [
          { label: 'Income', data: this.yearlyRecords.map(r => parseFloat(String(r.monthly_income)) || 0), backgroundColor: 'rgba(59,130,246,0.75)', borderColor: 'rgba(59,130,246,1)', borderWidth: 1, borderRadius: 4 },
          { label: 'Expenses', data: this.yearlyRecords.map(r => parseFloat(String(r.monthly_expenses)) || 0), backgroundColor: 'rgba(239,68,68,0.75)', borderColor: 'rgba(239,68,68,1)', borderWidth: 1, borderRadius: 4 },
          { label: 'Savings', data: this.yearlyRecords.map(r => parseFloat(String(r.savings)) || 0), backgroundColor: 'rgba(16,185,129,0.75)', borderColor: 'rgba(16,185,129,1)', borderWidth: 1, borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.dataset.label}: €${ctx.parsed.y.toFixed(2)}`
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { callback: (v: any) => '€' + v } }
        }
      }
    });
  }

  initCategoryChart(): void {
    if (!this.categoryChart?.nativeElement) return;
    const ctx = this.categoryChart.nativeElement.getContext('2d');
    this.categoryChartInstance = new (window as any).Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Income', 'Expenses', 'Savings'],
        datasets: [{
          data: [this.overviewIncome, this.overviewExpenses, Math.max(0, this.overviewSavings)],
          backgroundColor: ['rgba(59,130,246,0.8)', 'rgba(239,68,68,0.8)', 'rgba(16,185,129,0.8)'],
          borderColor: ['rgba(59,130,246,1)', 'rgba(239,68,68,1)', 'rgba(16,185,129,1)'],
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.label}: €${ctx.parsed.toFixed(2)}`
            }
          }
        }
      }
    });
  }
}
