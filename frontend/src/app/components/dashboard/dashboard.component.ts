import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, FinancialRecord } from '../../services/financial.service';

// Chart.js will be loaded via CDN

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <!-- Sidebar Menu -->
      <aside class="w-64 bg-teal-500 text-white shadow-lg flex-shrink-0">
        <div class="p-6">
          <h1 class="text-2xl font-bold">Vendora</h1>
          <p class="text-teal-100 text-sm mt-1">Menu</p>
        </div>

        <nav class="mt-6">
          <a
            routerLink="/dashboard"
            class="block px-6 py-3 text-white hover:bg-teal-600 transition-colors"
            [class.bg-teal-600]="isActive('/dashboard')"
          >
            <span class="font-semibold">Dashboard</span>
          </a>
          <a
            routerLink="/budgets"
            class="block px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          >
            <span class="font-semibold">Income</span>
          </a>
          <a
            routerLink="/budgets"
            class="block px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          >
            <span class="font-semibold">Expenses</span>
          </a>
          <a
            routerLink="/budgets"
            class="block px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          >
            <span class="font-semibold">Savings</span>
          </a>
          <a
            routerLink="/budgets"
            class="block px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          >
            <span class="font-semibold">Define Budgets</span>
          </a>
          <button
            (click)="logout()"
            class="w-full text-left px-6 py-3 text-red-100 hover:bg-teal-600 transition-colors"
          >
            <span class="font-semibold">Logout</span>
          </button>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1">
        <!-- Header -->
        <header class="bg-teal-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <h2 class="text-xl font-semibold">Financial Panel</h2>
              <div class="flex items-center space-x-4">
                <span>{{ user?.name }}</span>
                <span class="text-sm text-teal-200">{{ monthNames[currentMonth - 1] }} {{ currentYear }}</span>
              </div>
            </div>
          </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="mb-8">
            <h2 class="text-3xl font-bold text-gray-800">Dashboard</h2>
            <p class="text-gray-600">Welcome back, {{ user?.name }}!</p>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-sm font-semibold text-gray-500 mb-2 uppercase">Income</h3>
              <p class="text-3xl font-bold text-blue-600">€{{ formatCurrency(monthlyIncome) }}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-sm font-semibold text-gray-500 mb-2 uppercase">Expenses</h3>
              <p class="text-3xl font-bold text-red-600">€{{ formatCurrency(monthlyExpenses) }}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-sm font-semibold text-gray-500 mb-2 uppercase">Savings</h3>
              <p class="text-3xl font-bold text-green-600">€{{ formatCurrency(monthlySavings) }}</p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-sm font-semibold text-gray-500 mb-2 uppercase">Balance</h3>
              <p class="text-3xl font-bold text-teal-600">€{{ formatCurrency(totalBalance) }}</p>
            </div>
          </div>

          <!-- Charts -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-xl font-semibold text-gray-800 mb-4">Income vs Expenses vs Savings</h3>
              <canvas #incomeExpenseChart></canvas>
            </div>

            <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-xl font-semibold text-gray-800 mb-4">Monthly Overview</h3>
              <canvas #categoryChart></canvas>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                routerLink="/budgets"
                class="block bg-teal-500 text-white py-3 px-4 rounded-md hover:bg-teal-600 transition-colors text-center"
              >
                Define Budgets
              </a>
              <a
                routerLink="/transactions"
                class="block bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors text-center"
              >
                Transactions
              </a>
              <a
                routerLink="/investments"
                class="block bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors text-center"
              >
                Investments
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit, AfterViewInit {
  user: any = null;
  totalBalance: number = 0;
  monthlyIncome: number = 0;
  monthlyExpenses: number = 0;
  monthlySavings: number = 0;
  currentYear: number = new Date().getFullYear();
  currentMonth: number = new Date().getMonth() + 1;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  yearlyRecords: FinancialRecord[] = [];

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
    });

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
    }

    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.authService.getUserObservable().subscribe(user => {
      if (user) {
        this.monthlyIncome = parseFloat(String(user.monthly_income || 0)) || 0;
        this.monthlyExpenses = parseFloat(String(user.monthly_expenses || 0)) || 0;
        this.monthlySavings = (user.monthly_income || 0) - (user.monthly_expenses || 0);
        this.totalBalance = this.monthlyIncome - this.monthlyExpenses;

        if (user.current_year && user.current_month) {
          this.currentYear = user.current_year;
          this.currentMonth = user.current_month;
        }
      }
    });

    this.financialService.getCurrentRecord().subscribe({
      next: (record) => {
        this.monthlyIncome = parseFloat(String(record.monthly_income || 0));
        this.monthlyExpenses = parseFloat(String(record.monthly_expenses || 0));
        this.monthlySavings = parseFloat(String(record.savings || 0));
        this.totalBalance = this.monthlyIncome - this.monthlyExpenses;

        this.updateChartsWithRealData();
      },
      error: () => {
        this.updateChartsWithRealData();
      }
    });

    this.financialService.getYearRecords(this.currentYear).subscribe({
      next: (records) => {
        this.yearlyRecords = records;
        this.updateChartsWithRealData();
      },
      error: () => {
        this.yearlyRecords = [];
      }
    });
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  formatCurrency(value: any): string {
    const num = parseFloat(value) || 0;
    return num.toFixed(2);
  }

  updateChartsWithRealData(): void {
    if (this.incomeExpenseChartInstance && this.yearlyRecords.length > 0) {
      const labels = this.yearlyRecords.map(r => this.monthNames[r.month - 1].slice(0, 3));
      const incomeData = this.yearlyRecords.map(r => parseFloat(String(r.monthly_income)) || 0);
      const expensesData = this.yearlyRecords.map(r => parseFloat(String(r.monthly_expenses)) || 0);
      const savingsData = this.yearlyRecords.map(r => parseFloat(String(r.savings)) || 0);

      this.incomeExpenseChartInstance.data.labels = labels;
      this.incomeExpenseChartInstance.data.datasets[0].data = incomeData;
      this.incomeExpenseChartInstance.data.datasets[1].data = expensesData;
      this.incomeExpenseChartInstance.data.datasets[2].data = savingsData;
      this.incomeExpenseChartInstance.update();
    }

    if (this.categoryChartInstance) {
      this.categoryChartInstance.data.datasets[0].data = [
        this.monthlyIncome,
        this.monthlyExpenses,
        Math.max(0, this.monthlySavings)
      ];
      this.categoryChartInstance.update();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initIncomeExpenseChart();
      this.initCategoryChart();
    }, 100);
  }

  initIncomeExpenseChart(): void {
    if (this.incomeExpenseChart && this.incomeExpenseChart.nativeElement) {
      const ctx = this.incomeExpenseChart.nativeElement.getContext('2d');

      this.incomeExpenseChartInstance = new (window as any).Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.yearlyRecords.map(r => this.monthNames[r.month - 1].slice(0, 3)),
          datasets: [
            {
              label: 'Income',
              data: this.yearlyRecords.map(r => parseFloat(String(r.monthly_income)) || 0),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 1
            },
            {
              label: 'Expenses',
              data: this.yearlyRecords.map(r => parseFloat(String(r.monthly_expenses)) || 0),
              backgroundColor: 'rgba(239, 68, 68, 0.8)',
              borderColor: 'rgba(239, 68, 68, 1)',
              borderWidth: 1
            },
            {
              label: 'Savings',
              data: this.yearlyRecords.map(r => parseFloat(String(r.savings)) || 0),
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderColor: 'rgba(16, 185, 129, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'top',
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  initCategoryChart(): void {
    if (this.categoryChart && this.categoryChart.nativeElement) {
      const ctx = this.categoryChart.nativeElement.getContext('2d');

      this.categoryChartInstance = new (window as any).Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Income', 'Expenses', 'Savings'],
          datasets: [{
            data: [
              this.monthlyIncome,
              this.monthlyExpenses,
              Math.max(0, this.monthlySavings)
            ],
            backgroundColor: [
              'rgba(59, 130, 246, 0.8)',
              'rgba(239, 68, 68, 0.8)',
              'rgba(16, 185, 129, 0.8)'
            ],
            borderColor: [
              'rgba(59, 130, 246, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(16, 185, 129, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'right',
            }
          }
        }
      });
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      }
    });
  }
}
