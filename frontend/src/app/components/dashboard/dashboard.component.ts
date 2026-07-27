import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FinancialService, FinancialRecord } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, SidebarComponent, CurrencySymbolPipe],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <!-- Main Content -->
      <main class="flex-1 overflow-auto pt-14 lg:pt-0 pb-20">
        <!-- Header -->
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <div>
                <h2 class="text-xl font-semibold">Dashboard</h2>
                <p class="text-primary-200 text-xs">Welcome back, {{ user?.name }}!</p>
              </div>
              <div class="flex items-center gap-3">
                <input type="month" [value]="selectedMonth" (change)="onMonthChange($any($event.target).value)"
                  class="bg-primary-600 text-white text-sm rounded-lg px-3 py-1.5 border border-primary-500 focus:outline-none focus:ring-2 focus:ring-white/40" />
                <span class="text-sm text-primary-200 hidden sm:block">{{ monthNames[overviewMonth - 1] }} {{ overviewYear }}</span>

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
                    class="fixed left-4 right-4 top-20 z-50 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-96 sm:max-w-sm">
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
                          <div class="flex justify-between items-center gap-2 text-xs">
                            <span class="text-gray-500 whitespace-nowrap">Projected balance</span>
                            <span class="whitespace-nowrap shrink-0" [class]="projectedBalance >= 0 ? 'font-semibold text-primary-600' : 'font-semibold text-red-500'">{{ projectedBalance | currencySymbol }}</span>
                          </div>
                          <div class="flex justify-between items-center gap-2 text-xs">
                            <span class="text-gray-500 whitespace-nowrap">Daily avg spend</span>
                            <span class="font-semibold text-gray-700 whitespace-nowrap shrink-0">{{ dailyAvgSpend | currencySymbol }}</span>
                          </div>
                          <div class="flex justify-between items-center gap-2 text-xs">
                            <span class="text-gray-500 whitespace-nowrap">Days remaining</span>
                            <span class="font-semibold text-gray-700 whitespace-nowrap shrink-0">{{ daysRemaining }} days</span>
                          </div>
                          <div class="flex justify-between items-center gap-2 text-xs">
                            <span class="text-gray-500 whitespace-nowrap">Savings rate</span>
                            <span class="whitespace-nowrap shrink-0" [class]="savingsRate >= 20 ? 'font-semibold text-primary-600' : savingsRate >= 10 ? 'font-semibold text-yellow-600' : 'font-semibold text-red-500'">
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
              class="flex items-center gap-3 bg-white border border-gray-100 text-gray-800 px-4 py-3 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-semibold group">
              <span class="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                </svg>
              </span>
              <span>Budget</span>
              <svg class="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
            <a routerLink="/transactions"
              class="flex items-center gap-3 bg-white border border-gray-100 text-gray-800 px-4 py-3 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-semibold group">
              <span class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                </svg>
              </span>
              <span>Transactions</span>
              <svg class="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
            <a routerLink="/recurrent-transactions"
              class="flex items-center gap-3 bg-white border border-gray-100 text-gray-800 px-4 py-3 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-semibold group">
              <span class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </span>
              <span>Recurrent</span>
              <svg class="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
            <a routerLink="/investments"
              class="flex items-center gap-3 bg-white border border-gray-100 text-gray-800 px-4 py-3 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-semibold group">
              <span class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </span>
              <span>Investments</span>
              <svg class="w-3.5 h-3.5 ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-blue-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Income</h3>
              <p class="text-2xl font-bold text-blue-600">{{ overviewIncome | currencySymbol }}</p>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-red-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Expenses</h3>
              <p class="text-2xl font-bold text-red-600">{{ overviewExpenses | currencySymbol }}</p>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Savings</h3>
              <p class="text-2xl font-bold text-green-600">{{ overviewSavings | currencySymbol }}</p>
            </div>
            <div class="bg-white p-5 rounded-lg shadow-md border-l-4 border-primary-500">
              <h3 class="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Balance</h3>
              <p class="text-2xl font-bold text-primary-600">{{ overviewBalance | currencySymbol }}</p>
            </div>
          </div>

          <!-- Monthly Balance Breakdown -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            <div class="px-6 py-4 border-b border-gray-50">
              <h3 class="text-base font-semibold text-gray-800">Monthly Balance</h3>
              <p class="text-xs text-gray-400">Income, expenses and balance for each month of {{ overviewYear }}</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              <!-- Month list -->
              <div class="space-y-2">
                <div *ngFor="let m of monthBreakdown"
                  class="flex items-center justify-between p-3 rounded-lg transition-colors"
                  [class.bg-primary-50]="m.month === overviewMonth"
                  [class.border]="m.month === overviewMonth"
                  [class.border-primary-200]="m.month === overviewMonth">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold shrink-0">
                      {{ monthNames[m.month - 1].slice(0, 3) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-gray-800 truncate">{{ monthNames[m.month - 1] }}</p>
                      <p class="text-xs text-gray-500">
                        Balance
                        <span [class.text-green-600]="m.balance >= 0" [class.text-red-600]="m.balance < 0">
                          {{ m.balance | currencySymbol }}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-xs text-gray-400">In <span class="font-semibold text-gray-700">{{ m.income | currencySymbol }}</span></p>
                    <p class="text-xs text-gray-400">Out <span class="font-semibold text-gray-700">{{ m.expenses | currencySymbol }}</span></p>
                  </div>
                </div>
                <div *ngIf="monthBreakdown.length === 0" class="text-gray-300 text-center py-8 text-sm">No monthly data yet</div>
              </div>
              <!-- Balance trend chart -->
              <div class="flex flex-col">
                <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Balance trend</h4>
                <div style="height: 220px">
                  <canvas #monthlyBalanceChart></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Charts row -->
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">

            <!-- Bar chart: Income vs Expenses (spans 3 cols) -->
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-3">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="text-base font-semibold text-gray-800">Income vs Expenses</h3>
                  <p class="text-xs text-gray-400">{{ overviewYear }} overview</p>
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
                <span class="text-xs font-medium text-gray-600">{{ monthNames[overviewMonth-1].slice(0,3) }} {{ overviewYear }}</span>
              </div>
              <div class="relative flex items-center justify-center" style="height:170px">
                <canvas #categoryChart></canvas>
                <div class="absolute text-center pointer-events-none">
                  <p class="text-xs text-gray-400">Total</p>
                  <p class="text-lg font-bold text-gray-700">{{ overviewIncome | currencySymbol }}</p>
                </div>
              </div>
              <div class="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <div class="bg-primary-50 rounded-lg p-2">
                  <p class="text-gray-400">Income</p>
                  <p class="font-bold text-primary-600">{{ overviewIncome | currencySymbol }}</p>
                </div>
                <div class="bg-red-50 rounded-lg p-2">
                  <p class="text-gray-400">Expenses</p>
                  <p class="font-bold text-red-500">{{ overviewExpenses | currencySymbol }}</p>
                </div>
                <div class="bg-indigo-50 rounded-lg p-2">
                  <p class="text-gray-400">Saved</p>
                  <p class="font-bold text-indigo-500">{{ overviewSavings | currencySymbol }}</p>
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
                  <div class="text-xs font-semibold text-gray-700 w-14 text-right shrink-0">{{ item.total | currencySymbol }}</div>
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
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  yearlyRecords: FinancialRecord[] = [];

  overviewYear = new Date().getFullYear();
  overviewMonth = new Date().getMonth() + 1;
  overviewIncome = 0;
  overviewExpenses = 0;
  overviewSavings = 0;
  selectedMonth = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;

  monthBreakdown: { month: number; income: number; expenses: number; balance: number }[] = [];

  userInitials = '';

  get overviewBalance(): number { return this.overviewIncome - this.overviewExpenses; }

  @ViewChild('incomeExpenseChart') incomeExpenseChart!: ElementRef;
  @ViewChild('categoryChart') categoryChart!: ElementRef;
  @ViewChild('categoryBreakdownChart') categoryBreakdownChart!: ElementRef;
  @ViewChild('monthlyBalanceChart') monthlyBalanceChart!: ElementRef;

  private incomeExpenseChartInstance: any;
  private categoryChartInstance: any;
  private categoryBreakdownChartInstance: any;
  private monthlyBalanceChartInstance: any;

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


  constructor(
    private authService: AuthService,
    private financialService: FinancialService,
    private router: Router,
    public currencyService: CurrencyService
  ) {}

  ngOnInit(): void {
    this.authService.getUserObservable().subscribe(user => {
      this.user = user;
      if (user?.current_year) this.currentYear = user.current_year;
      if (user?.current_month) this.currentMonth = user.current_month;
      this.overviewYear = this.currentYear;
      this.overviewMonth = this.currentMonth;
      this.selectedMonth = `${this.overviewYear}-${String(this.overviewMonth).padStart(2, '0')}`;
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
        this.updateOverviewFromRecord(record);
        this.updateChartsWithRealData();
        this.computeAlerts(this.overviewYear, this.overviewMonth, this.overviewIncome, this.overviewExpenses, this.overviewSavings);
      },
      error: () => this.updateChartsWithRealData()
    });

    this.loadExpensesByCategory();

    this.financialService.getYearRecords(this.overviewYear).subscribe({
      next: (records) => {
        this.yearlyRecords = records;
        this.updateMonthBreakdown();
        this.updateChartsWithRealData();
      },
      error: () => { this.yearlyRecords = []; this.updateMonthBreakdown(); }
    });
  }

  updateOverviewFromRecord(record: FinancialRecord): void {
    this.overviewIncome = parseFloat(String(record.monthly_income || 0));
    this.overviewExpenses = parseFloat(String(record.monthly_expenses || 0));
    this.overviewSavings = parseFloat(String(record.savings || 0));
    this.updateOverviewChart();
  }

  computeAlerts(year: number, month: number, income: number, expenses: number, savings: number): void {
    const alerts: { type: 'danger' | 'warning' | 'info'; title: string; message: string }[] = [];
    const now = new Date();
    const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayOfMonth = isCurrent ? now.getDate() : daysInMonth;
    this.daysRemaining = daysInMonth - dayOfMonth;

    const monthName = this.monthNames[month - 1];

    this.dailyAvgSpend = dayOfMonth > 0 ? expenses / dayOfMonth : 0;
    this.projectedBalance = income - expenses - (this.dailyAvgSpend * this.daysRemaining);
    this.savingsRate = income > 0 ? (savings / income) * 100 : 0;

    if (expenses > income) {
      alerts.push({ type: 'danger', title: 'Expenses exceed income', message: `You've spent ${this.currencyService.symbol}${this.formatCurrency(expenses - income)} more than you earned in ${monthName}.` });
    } else if (expenses > income * 0.9) {
      alerts.push({ type: 'warning', title: 'Spending at 90%+ of income', message: `Only ${this.currencyService.symbol}${this.formatCurrency(income - expenses)} left from your income in ${monthName}.` });
    }

    if (this.savingsRate < 10 && income > 0) {
      alerts.push({ type: 'warning', title: 'Low savings rate', message: `You're saving ${this.savingsRate.toFixed(1)}% of income in ${monthName}. Target is at least 20%.` });
    }

    if (this.projectedBalance < 0) {
      alerts.push({ type: 'danger', title: `Negative ${monthName} projection`, message: `At current daily spend (${this.currencyService.symbol}${this.formatCurrency(this.dailyAvgSpend)}/day), you'll end ${monthName} ${this.currencyService.symbol}${this.formatCurrency(Math.abs(this.projectedBalance))} short.` });
    } else if (this.projectedBalance < income * 0.1) {
      alerts.push({ type: 'warning', title: 'Tight projected balance', message: `Projected end of ${monthName} balance is only ${this.currencyService.symbol}${this.formatCurrency(this.projectedBalance)}.` });
    } else {
      alerts.push({ type: 'info', title: `On track in ${monthName}`, message: `Projected to save ${this.currencyService.symbol}${this.formatCurrency(this.projectedBalance)} by end of ${monthName}.` });
    }

    if (isCurrent && this.daysRemaining <= 7 && expenses > income * 0.8) {
      alerts.push({ type: 'warning', title: 'Month ending soon', message: `${this.daysRemaining} days left in ${monthName}. Watch your spending to stay positive.` });
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

  updateMonthBreakdown(): void {
    this.monthBreakdown = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const record = this.yearlyRecords.find(r => r.year === this.overviewYear && r.month === month);
      const income = parseFloat(String(record?.monthly_income || 0));
      const expenses = parseFloat(String(record?.monthly_expenses || 0));
      return { month, income, expenses, balance: income - expenses };
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
    let year = this.overviewYear;
    let month = this.overviewMonth - 1;
    if (month < 1) { month = 12; year--; }
    this.setMonth(year, month);
  }

  nextMonth(): void {
    let year = this.overviewYear;
    let month = this.overviewMonth + 1;
    if (month > 12) { month = 1; year++; }
    this.setMonth(year, month);
  }

  setMonth(year: number, month: number): void {
    this.overviewYear = year;
    this.overviewMonth = month;
    this.selectedMonth = `${year}-${String(month).padStart(2, '0')}`;
    this.loadOverviewMonth();
    this.loadExpensesByCategory();
  }

  onMonthChange(monthStr: string): void {
    if (!monthStr) return;
    const [year, month] = monthStr.split('-').map(Number);
    this.setMonth(year, month);
  }

  loadOverviewMonth(): void {
    const record = this.yearlyRecords.find(r => r.year === this.overviewYear && r.month === this.overviewMonth);
    if (record) {
      this.updateMonthBreakdown();
      this.updateOverviewFromRecord(record);
      this.computeAlerts(this.overviewYear, this.overviewMonth, this.overviewIncome, this.overviewExpenses, this.overviewSavings);
      this.updateChartsWithRealData();
    } else {
      this.financialService.getYearRecords(this.overviewYear).subscribe({
        next: (records) => {
          this.yearlyRecords = records;
          this.updateMonthBreakdown();
          const r = records.find(rec => rec.month === this.overviewMonth);
          if (r) { this.updateOverviewFromRecord(r); }
          else { this.overviewIncome = 0; this.overviewExpenses = 0; this.overviewSavings = 0; this.updateOverviewChart(); }
          this.computeAlerts(this.overviewYear, this.overviewMonth, this.overviewIncome, this.overviewExpenses, this.overviewSavings);
          this.updateChartsWithRealData();
        },
        error: () => {
          this.yearlyRecords = [];
          this.updateMonthBreakdown();
          this.overviewIncome = 0; this.overviewExpenses = 0; this.overviewSavings = 0; this.updateOverviewChart();
          this.computeAlerts(this.overviewYear, this.overviewMonth, 0, 0, 0);
          this.updateChartsWithRealData();
        }
      });
    }
  }

  formatCurrency(value: any): string {
    return (parseFloat(value) || 0).toFixed(2);
  }

  updateChartsWithRealData(): void {
    if (this.incomeExpenseChartInstance && this.yearlyRecords.length > 0) {
      const labels = this.monthNames.map(m => m.slice(0, 3));
      this.incomeExpenseChartInstance.data.labels = labels;
      this.incomeExpenseChartInstance.data.datasets[0].data = this.monthBreakdown.map(m => m.income);
      this.incomeExpenseChartInstance.data.datasets[1].data = this.monthBreakdown.map(m => m.expenses);
      this.incomeExpenseChartInstance.data.datasets[2].data = this.monthBreakdown.map(m => Math.max(0, m.balance));
      this.incomeExpenseChartInstance.update();
    }
    this.updateOverviewChart();
    this.updateMonthlyBalanceChart();
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
      this.initMonthlyBalanceChart();
    }, 200);
  }

  initIncomeExpenseChart(): void {
    if (!this.incomeExpenseChart?.nativeElement) return;
    const ctx = this.incomeExpenseChart.nativeElement.getContext('2d');
    const symbol = this.currencyService.symbol;

    this.incomeExpenseChartInstance = new (window as any).Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthNames.map(m => m.slice(0, 3)),
        datasets: [
          {
            label: 'Income',
            data: this.monthBreakdown.map(m => m.income),
            backgroundColor: '#2dd4bf',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: 'Expenses',
            data: this.monthBreakdown.map(m => m.expenses),
            backgroundColor: '#f87171',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          },
          {
            label: 'Balance',
            data: this.monthBreakdown.map(m => Math.max(0, m.balance)),
            backgroundColor: '#818cf8',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, labels: { usePointStyle: true, boxWidth: 8, padding: 10, font: { size: 11 }, color: '#6b7280' } },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: any) => ` ${c.dataset.label}: ${symbol}${c.parsed.y.toFixed(2)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: {
            beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: any) => symbol + v }
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

  initMonthlyBalanceChart(): void {
    if (!this.monthlyBalanceChart?.nativeElement) return;
    const ctx = this.monthlyBalanceChart.nativeElement.getContext('2d');
    const symbol = this.currencyService.symbol;
    const data = this.monthBreakdown.map(m => m.balance);
    const colors = this.monthBreakdown.map(m => m.balance >= 0 ? '#10b981' : '#ef4444');

    this.monthlyBalanceChartInstance = new (window as any).Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.monthNames.map(m => m.slice(0, 3)),
        datasets: [{
          label: 'Balance',
          data,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(17,24,39,0.85)',
            titleColor: '#e5e7eb', bodyColor: '#d1d5db',
            padding: 10, cornerRadius: 8,
            callbacks: { label: (c: any) => ` Balance: ${symbol}${c.parsed.y.toFixed(2)}` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { size: 11 } } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 11 }, callback: (v: any) => symbol + v } }
        }
      }
    });
  }

  updateMonthlyBalanceChart(): void {
    if (!this.monthlyBalanceChartInstance) {
      this.initMonthlyBalanceChart();
      return;
    }
    this.monthlyBalanceChartInstance.data.datasets[0].data = this.monthBreakdown.map(m => m.balance);
    this.monthlyBalanceChartInstance.data.datasets[0].backgroundColor = this.monthBreakdown.map(m => m.balance >= 0 ? '#10b981' : '#ef4444');
    this.monthlyBalanceChartInstance.update();
  }
}
