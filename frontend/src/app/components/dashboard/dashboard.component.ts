import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, FinancialRecord, NetWorth } from '../../services/financial.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <!-- Main Content -->
      <main class="flex-1 overflow-auto pt-14 lg:pt-0">
        <!-- Header -->
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <div>
                <h2 class="text-xl font-semibold">Dashboard</h2>
                <p class="text-primary-200 text-xs">Welcome back, {{ user?.name }}!</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm text-primary-200 hidden sm:block">{{ monthNames[currentMonth - 1] }} {{ currentYear }}</span>

                <!-- Notification Bell -->
                <div class="relative alerts-panel-wrapper">
                  <button (click)="toggleAlerts()" class="relative p-2 rounded-lg hover:bg-primary-600 transition-colors">
                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    <span *ngIf="alertCount > 0"
                      class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {{ alertCount }}
                    </span>
                  </button>

                  <!-- Alerts Panel -->
                  <div *ngIf="showAlerts"
                    class="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <h3 class="font-semibold text-gray-800 text-base">Alerts</h3>
                      <div class="flex items-center gap-3">
                        <button *ngIf="visibleAlerts.length > 0" (click)="clearAllAlerts()" class="text-xs text-gray-400 hover:text-red-500 font-medium transition-colors">Clear all</button>
                        <button (click)="showAlerts = false" class="text-gray-400 hover:text-gray-600 transition-colors">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </div>

                    <div class="max-h-96 overflow-y-auto">
                      <!-- Status badge -->
                      <div class="px-5 py-4 border-b border-gray-50">
                        <div class="flex items-center gap-2">
                          <span [class]="visibleAlerts.length === 0 ? 'text-green-500' : (hasCritical ? 'text-red-500' : 'text-yellow-500')">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path *ngIf="visibleAlerts.length === 0" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                              <path *ngIf="visibleAlerts.length > 0" fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                          </span>
                          <span class="font-semibold text-gray-800 text-sm">{{ visibleAlerts.length === 0 ? 'All good!' : (hasCritical ? 'Attention needed' : 'Some warnings') }}</span>
                        </div>
                        <p *ngIf="visibleAlerts.length === 0" class="text-xs text-green-600 mt-1 ml-7">Your finances look healthy this month.</p>
                      </div>

                      <!-- Alert items -->
                      <div *ngFor="let alert of visibleAlerts; let i = index" class="px-5 py-3 border-b border-gray-50 last:border-0">
                        <div class="flex items-start gap-3">
                          <span [class]="alert.type === 'danger' ? 'text-red-400 mt-0.5' : alert.type === 'warning' ? 'text-yellow-400 mt-0.5' : 'text-primary-400 mt-0.5'">
                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path *ngIf="alert.type === 'danger'" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                              <path *ngIf="alert.type === 'warning'" fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                              <path *ngIf="alert.type === 'info'" fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                            </svg>
                          </span>
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-800">{{ alert.title }}</p>
                            <p class="text-xs text-gray-500 mt-0.5">{{ alert.message }}</p>
                          </div>
                          <button (click)="dismissAlert(alert)" class="shrink-0 mt-0.5 text-gray-300 hover:text-gray-500 transition-colors" title="Dismiss">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      </div>

                      <!-- Monthly projection -->
                      <div class="px-5 py-4 bg-gray-50">
                        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Monthly Projection</p>
                        <div class="space-y-2">
                          <div class="flex justify-between text-xs">
                            <span class="text-gray-500">Projected balance</span>
                            <span [class]="projectedBalance >= 0 ? 'font-semibold text-primary-600' : 'font-semibold text-red-500'">€{{ formatCurrency(projectedBalance) }}</span>
                          </div>
                          <div class="flex justify-between text-xs">
                            <span class="text-gray-500">Daily avg spend</span>
                            <span class="font-semibold text-gray-700">€{{ formatCurrency(dailyAvgSpend) }}</span>
                          </div>
                          <div class="flex justify-between text-xs">
                            <span class="text-gray-500">Days remaining</span>
                            <span class="font-semibold text-gray-700">{{ daysRemaining }} days</span>
                          </div>
                          <div class="flex justify-between text-xs">
                            <span class="text-gray-500">Savings rate</span>
                            <span [class]="savingsRate >= 20 ? 'font-semibold text-primary-600' : savingsRate >= 10 ? 'font-semibold text-yellow-600' : 'font-semibold text-red-500'">
                              {{ savingsRate.toFixed(1) }}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <a routerLink="/account" class="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 transition-colors px-3 py-1.5 rounded-lg">
                  <div class="w-7 h-7 rounded-full bg-primary-300 flex items-center justify-center text-primary-800 text-xs font-bold">
                    {{ userInitials }}
                  </div>
                  <span class="text-sm text-white font-medium hidden sm:block">{{ user?.name }}</span>
                </a>
              </div>
            </div>
          </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          <!-- Quick Actions (top) -->
          <div class="flex flex-wrap gap-3 mb-6">
            <a routerLink="/budgets"
              class="flex items-center gap-2 bg-primary-500 text-white py-2 px-4 rounded-md hover:bg-primary-600 transition-colors text-sm font-semibold shadow">
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
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-primary-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Balance</h3>
              <p class="text-2xl font-bold text-primary-600">€{{ formatCurrency(totalBalance) }}</p>
            </div>
          </div>

          <!-- Net Worth Widget -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 class="text-base font-semibold text-gray-800">Net Worth</h3>
                <p class="text-xs text-gray-400">All-time: cash balance + investment portfolio</p>
              </div>
              <a routerLink="/investments" class="text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors">View investments →</a>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div class="px-6 py-4">
                <p class="text-xs text-gray-400 mb-1">Net Worth</p>
                <p class="text-2xl font-bold" [class]="netWorth.net_worth >= 0 ? 'text-primary-600' : 'text-red-600'">
                  €{{ formatCurrency(netWorth.net_worth) }}
                </p>
              </div>
              <div class="px-6 py-4">
                <p class="text-xs text-gray-400 mb-1">Cash Balance</p>
                <p class="text-xl font-semibold" [class]="netWorth.cash_balance >= 0 ? 'text-blue-600' : 'text-red-600'">
                  €{{ formatCurrency(netWorth.cash_balance) }}
                </p>
                <p class="text-xs text-gray-400 mt-0.5">income − expenses</p>
              </div>
              <div class="px-6 py-4">
                <p class="text-xs text-gray-400 mb-1">Investments</p>
                <p class="text-xl font-semibold text-purple-600">€{{ formatCurrency(netWorth.investment_value) }}</p>
                <p class="text-xs mt-0.5" [class]="netWorth.investment_gain >= 0 ? 'text-green-500' : 'text-red-500'">
                  {{ netWorth.investment_gain >= 0 ? '+' : '' }}€{{ formatCurrency(netWorth.investment_gain) }} gain
                </p>
              </div>
              <div class="px-6 py-4">
                <p class="text-xs text-gray-400 mb-1">Investment ROI</p>
                <p class="text-xl font-semibold" [class]="netWorth.investment_roi >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ netWorth.investment_roi >= 0 ? '+' : '' }}{{ netWorth.investment_roi.toFixed(2) }}%
                </p>
              </div>
            </div>
          </div>

          <!-- Charts row -->
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

            <!-- Area chart: Income vs Expenses (spans 3 cols) -->
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-3">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-base font-semibold text-gray-800">Income vs Expenses</h3>
                  <p class="text-xs text-gray-400">{{ currentYear }} overview</p>
                </div>
                <div class="flex items-center gap-4 text-xs text-gray-500">
                  <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-primary-400"></span>Income</span>
                  <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-red-400"></span>Expenses</span>
                  <span class="flex items-center gap-1"><span class="inline-block w-3 h-3 rounded-full bg-indigo-400"></span>Savings</span>
                </div>
              </div>
              <div *ngIf="yearlyRecords.length === 0" class="text-gray-300 text-center py-14 text-sm">No data yet</div>
              <canvas #incomeExpenseChart style="max-height:220px"></canvas>
            </div>

            <!-- Doughnut: monthly overview (spans 2 cols) -->
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-base font-semibold text-gray-800">Monthly Snapshot</h3>
                <div class="flex items-center gap-1">
                  <button (click)="prevMonth()" class="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                  <span class="text-xs font-medium text-gray-600 w-24 text-center">{{ monthNames[overviewMonth-1].slice(0,3) }} {{ overviewYear }}</span>
                  <button (click)="nextMonth()" class="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </div>
              <div class="relative flex items-center justify-center" style="height:170px">
                <canvas #categoryChart></canvas>
                <div class="absolute text-center pointer-events-none">
                  <p class="text-xs text-gray-400">Total</p>
                  <p class="text-lg font-bold text-gray-700">€{{ formatCurrency(overviewIncome) }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <div class="bg-primary-50 rounded-lg p-2">
                  <p class="text-gray-400">Income</p>
                  <p class="font-bold text-primary-600">€{{ formatCurrency(overviewIncome) }}</p>
                </div>
                <div class="bg-red-50 rounded-lg p-2">
                  <p class="text-gray-400">Expenses</p>
                  <p class="font-bold text-red-500">€{{ formatCurrency(overviewExpenses) }}</p>
                </div>
                <div class="bg-indigo-50 rounded-lg p-2">
                  <p class="text-gray-400">Saved</p>
                  <p class="font-bold text-indigo-500">€{{ formatCurrency(overviewSavings) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Expenses by Category -->
          <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-base font-semibold text-gray-800">Expenses by Category</h3>
                <p class="text-xs text-gray-400">{{ monthNames[overviewMonth-1] }} {{ overviewYear }}</p>
              </div>
            </div>
            <div *ngIf="expensesByCategory.length === 0" class="text-gray-300 text-center py-8 text-sm">No expense transactions this month</div>
            <div *ngIf="expensesByCategory.length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              <!-- Bar list -->
              <div class="space-y-3">
                <div *ngFor="let item of expensesByCategory" class="flex items-center gap-3">
                  <div class="w-24 text-xs text-gray-600 truncate shrink-0">{{ item.category }}</div>
                  <div class="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div class="h-2.5 rounded-full transition-all duration-500"
                      [style.width]="getExpensePct(item.total) + '%'"
                      [style.background]="item.color"></div>
                  </div>
                  <div class="text-xs font-semibold text-gray-700 w-14 text-right shrink-0">€{{ item.total.toFixed(2) }}</div>
                  <!-- Percentage circle -->
                  <div class="relative w-9 h-9 shrink-0">
                    <svg class="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" stroke-width="3"/>
                      <circle cx="18" cy="18" r="15" fill="none"
                        [attr.stroke]="item.color"
                        stroke-width="3"
                        stroke-linecap="round"
                        [attr.stroke-dasharray]="getCategoryPctCircle(item.total) + ' 94.25'"
                        stroke-dashoffset="0"/>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span class="text-gray-700 font-bold" style="font-size:7px">{{ getCategoryPct(item.total) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Doughnut -->
              <div class="flex justify-center" style="max-height:220px">
                <canvas #categoryBreakdownChart></canvas>
              </div>
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

  userInitials = '';

  @ViewChild('incomeExpenseChart') incomeExpenseChart!: ElementRef;
  @ViewChild('categoryChart') categoryChart!: ElementRef;
  @ViewChild('categoryBreakdownChart') categoryBreakdownChart!: ElementRef;

  private incomeExpenseChartInstance: any;
  private categoryChartInstance: any;
  private categoryBreakdownChartInstance: any;

  expensesByCategory: { category: string; color: string; total: number }[] = [];
  private maxExpense = 0;

  showAlerts = false;
  alerts: { type: 'danger' | 'warning' | 'info'; title: string; message: string }[] = [];
  dismissedAlerts = new Set<string>();
  hasCritical = false;
  alertCount = 0;
  projectedBalance = 0;
  dailyAvgSpend = 0;
  daysRemaining = 0;
  savingsRate = 0;

  netWorth: NetWorth = {
    net_worth: 0, cash_balance: 0,
    investment_value: 0, investment_cost: 0,
    investment_gain: 0, investment_roi: 0,
    total_income: 0, total_expenses: 0,
  };

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
      const name: string = user?.name || '';
      this.userInitials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
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
        this.computeAlerts();
      },
      error: () => this.updateChartsWithRealData()
    });

    this.loadExpensesByCategory();
    this.loadNetWorth();

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

  computeAlerts(): void {
    const alerts: { type: 'danger' | 'warning' | 'info'; title: string; message: string }[] = [];
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    this.daysRemaining = daysInMonth - dayOfMonth;

    const income = this.monthlyIncome;
    const expenses = this.monthlyExpenses;
    const savings = this.monthlySavings;

    this.dailyAvgSpend = dayOfMonth > 0 ? expenses / dayOfMonth : 0;
    this.projectedBalance = income - expenses - (this.dailyAvgSpend * this.daysRemaining);
    this.savingsRate = income > 0 ? (savings / income) * 100 : 0;

    if (expenses > income) {
      alerts.push({ type: 'danger', title: 'Expenses exceed income', message: `You've spent €${this.formatCurrency(expenses - income)} more than you earned this month.` });
    } else if (expenses > income * 0.9) {
      alerts.push({ type: 'warning', title: 'Spending at 90%+ of income', message: `Only €${this.formatCurrency(income - expenses)} left from your income.` });
    }

    if (this.savingsRate < 10 && income > 0) {
      alerts.push({ type: 'warning', title: 'Low savings rate', message: `You're saving ${this.savingsRate.toFixed(1)}% of income. Target is at least 20%.` });
    }

    if (this.projectedBalance < 0) {
      alerts.push({ type: 'danger', title: 'Negative month projected', message: `At current daily spend (€${this.formatCurrency(this.dailyAvgSpend)}/day), you'll end the month €${this.formatCurrency(Math.abs(this.projectedBalance))} short.` });
    } else if (this.projectedBalance < income * 0.1) {
      alerts.push({ type: 'warning', title: 'Tight projected balance', message: `Projected end-of-month balance is only €${this.formatCurrency(this.projectedBalance)}.` });
    } else {
      alerts.push({ type: 'info', title: 'On track this month', message: `Projected to save €${this.formatCurrency(this.projectedBalance)} by end of month.` });
    }

    if (this.daysRemaining <= 7 && expenses > income * 0.8) {
      alerts.push({ type: 'warning', title: 'Month ending soon', message: `${this.daysRemaining} days left. Watch your spending to stay positive.` });
    }

    this.alerts = alerts;
    this.hasCritical = this.visibleAlerts.some(a => a.type === 'danger');
    this.alertCount = this.visibleAlerts.filter(a => a.type !== 'info').length;
  }

  get visibleAlerts() {
    return this.alerts.filter(a => !this.dismissedAlerts.has(a.title));
  }

  dismissAlert(alert: { type: string; title: string; message: string }): void {
    this.dismissedAlerts.add(alert.title);
    this.hasCritical = this.visibleAlerts.some(a => a.type === 'danger');
    this.alertCount = this.visibleAlerts.filter(a => a.type !== 'info').length;
  }

  clearAllAlerts(): void {
    this.alerts.forEach(a => this.dismissedAlerts.add(a.title));
    this.hasCritical = false;
    this.alertCount = 0;
  }

  toggleAlerts(): void {
    this.showAlerts = !this.showAlerts;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showAlerts) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.alerts-panel-wrapper')) {
      this.showAlerts = false;
    }
  }

  loadExpensesByCategory(): void {
    const month = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;
    this.financialService.getExpensesByCategory(month).subscribe({
      next: data => {
        this.expensesByCategory = data;
        this.maxExpense = data.length ? Math.max(...data.map(d => d.total)) : 1;
        this.updateCategoryBreakdownChart();
      },
      error: () => { this.expensesByCategory = []; }
    });
  }

  loadNetWorth(): void {
    this.financialService.getNetWorth().subscribe({
      next: (data) => { this.netWorth = data; },
      error: () => {}
    });
  }

  getExpensePct(total: number): number {
    return this.maxExpense > 0 ? Math.round((total / this.maxExpense) * 100) : 0;
  }

  getTotalExpenses(): number {
    return this.expensesByCategory.reduce((s, e) => s + e.total, 0);
  }

  getCategoryPct(total: number): number {
    const t = this.getTotalExpenses();
    return t > 0 ? Math.round((total / t) * 100) : 0;
  }

  getCategoryPctCircle(total: number): number {
    return (this.getCategoryPct(total) / 100) * 94.25;
  }

  prevMonth(): void {
    if (this.overviewMonth === 1) { this.overviewMonth = 12; this.overviewYear--; }
    else { this.overviewMonth--; }
    this.loadOverviewMonth();
    this.loadExpensesByCategory();
  }

  nextMonth(): void {
    if (this.overviewMonth === 12) { this.overviewMonth = 1; this.overviewYear++; }
    else { this.overviewMonth++; }
    this.loadOverviewMonth();
    this.loadExpensesByCategory();
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
      this.initCategoryBreakdownChart();
    }, 200);
  }

  initIncomeExpenseChart(): void {
    if (!this.incomeExpenseChart?.nativeElement) return;
    const canvas = this.incomeExpenseChart.nativeElement;
    const ctx = canvas.getContext('2d');

    const mkGradient = (r: number, g: number, b: number) => {
      const grad = ctx.createLinearGradient(0, 0, 0, 220);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.35)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0.01)`);
      return grad;
    };

    this.incomeExpenseChartInstance = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels: this.yearlyRecords.map(r => this.monthNames[r.month - 1].slice(0, 3)),
        datasets: [
          {
            label: 'Income',
            data: this.yearlyRecords.map(r => parseFloat(String(r.monthly_income)) || 0),
            borderColor: '#2dd4bf', backgroundColor: mkGradient(45,212,191),
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#2dd4bf',
            tension: 0.4, fill: true
          },
          {
            label: 'Expenses',
            data: this.yearlyRecords.map(r => parseFloat(String(r.monthly_expenses)) || 0),
            borderColor: '#f87171', backgroundColor: mkGradient(248,113,113),
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#f87171',
            tension: 0.4, fill: true
          },
          {
            label: 'Savings',
            data: this.yearlyRecords.map(r => parseFloat(String(r.savings)) || 0),
            borderColor: '#818cf8', backgroundColor: mkGradient(129,140,248),
            borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#818cf8',
            tension: 0.4, fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: any) => ` ${c.dataset.label}: €${c.parsed.y.toFixed(2)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: {
            beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: any) => '€' + v }
          }
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
          backgroundColor: ['#2dd4bf', '#f87171', '#818cf8'],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 6,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: any) => ` ${c.label}: €${c.parsed.toFixed(2)}` }
          }
        }
      }
    });
  }

  initCategoryBreakdownChart(): void {
    if (!this.categoryBreakdownChart?.nativeElement) return;
    const ctx = this.categoryBreakdownChart.nativeElement.getContext('2d');
    this.categoryBreakdownChartInstance = new (window as any).Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.expensesByCategory.map(e => e.category),
        datasets: [{
          data: this.expensesByCategory.map(e => e.total),
          backgroundColor: this.expensesByCategory.map(e => e.color),
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 6,
          borderRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, padding: 10, font: { size: 11 }, color: '#6b7280' } },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: any) => ` ${c.label}: €${c.parsed.toFixed(2)}` }
          }
        }
      }
    });
  }

  updateCategoryBreakdownChart(): void {
    if (!this.categoryBreakdownChartInstance) {
      this.initCategoryBreakdownChart();
      return;
    }
    this.categoryBreakdownChartInstance.data.labels = this.expensesByCategory.map(e => e.category);
    this.categoryBreakdownChartInstance.data.datasets[0].data = this.expensesByCategory.map(e => e.total);
    this.categoryBreakdownChartInstance.data.datasets[0].backgroundColor = this.expensesByCategory.map(e => e.color);
    this.categoryBreakdownChartInstance.update();
  }
}
