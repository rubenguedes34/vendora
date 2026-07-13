import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { FinancialService } from '../../services/financial.service';
import { CurrencyService } from '../../services/currency.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { CurrencySymbolPipe } from '../../pipes/currency-symbol.pipe';
import { environment } from '../../../environments/environment';

const INVESTMENT_TYPES = ['Stocks', 'ETF', 'Crypto', 'Real Estate', 'Bonds', 'Savings Account', 'Other'];
const TYPE_COLORS: Record<string, string> = {
  'Stocks': '#8b5cf6', 'ETF': '#3b82f6', 'Crypto': '#f59e0b',
  'Real Estate': '#10b981', 'Bonds': '#6366f1', 'Savings Account': '#14b8a6', 'Other': '#94a3b8'
};

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SidebarComponent, CurrencySymbolPipe],
  template: `
    <div class="min-h-screen bg-gray-100 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto pt-14 lg:pt-0">
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <h2 class="text-xl font-semibold">Investments</h2>
              <button (click)="toggleForm()"
                class="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors text-sm">
                {{ showForm && !editingId ? '✕ Cancel' : '+ Add Investment' }}
              </button>
            </div>
          </div>
        </header>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

          <!-- Error banner -->
          <div *ngIf="loadError" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
            <span>{{ loadError }}</span>
            <button (click)="loadInvestments(true)" class="ml-4 text-xs font-semibold underline hover:text-red-800">Retry</button>
          </div>

          <!-- Summary Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div class="bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-purple-400 flex items-center justify-between">
              <p class="text-xs text-gray-400 uppercase tracking-wide">Invested</p>
              <p class="text-base font-bold text-purple-600">{{ totalInitial | currencySymbol }}</p>
            </div>
            <div class="bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-400 flex items-center justify-between">
              <p class="text-xs text-gray-400 uppercase tracking-wide">Current</p>
              <p class="text-base font-bold text-blue-600">{{ totalCurrent | currencySymbol }}</p>
            </div>
            <div class="bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 border-l-4 flex items-center justify-between"
              [class.border-l-green-400]="totalGain >= 0" [class.border-l-red-400]="totalGain < 0">
              <p class="text-xs text-gray-400 uppercase tracking-wide">Gain/Loss</p>
              <p class="text-base font-bold" [class]="totalGain >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ totalGain >= 0 ? '+' : '' }}{{ totalGain | currencySymbol }}
              </p>
            </div>
            <div class="bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 border-l-4 flex items-center justify-between"
              [class.border-l-green-400]="totalRoi >= 0" [class.border-l-red-400]="totalRoi < 0">
              <p class="text-xs text-gray-400 uppercase tracking-wide">ROI</p>
              <p class="text-base font-bold" [class]="totalRoi >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ totalRoi >= 0 ? '+' : '' }}{{ totalRoi.toFixed(2) }}%
              </p>
            </div>
          </div>

          <!-- Charts + Add Form row -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            <!-- Portfolio Breakdown Donut Chart -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-1">
              <h3 class="text-sm font-semibold text-gray-700 mb-4">Portfolio Breakdown</h3>
              <div *ngIf="investments.length === 0 && !isLoading" class="flex flex-col items-center justify-center h-40 text-gray-300">
                <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/>
                </svg>
                <p class="text-xs">Add investments to see chart</p>
              </div>
              <div *ngIf="isLoading" class="flex items-center justify-center h-40">
                <div class="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
              <div *ngIf="investments.length > 0 && !isLoading">
                <!-- SVG Donut -->
                <div class="flex justify-center mb-4">
                  <svg width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r="54" fill="none" stroke="#f3f4f6" stroke-width="22"/>
                    <ng-container *ngFor="let seg of donutSegments">
                      <circle cx="70" cy="70" r="54" fill="none"
                        [attr.stroke]="seg.color"
                        stroke-width="22"
                        [attr.stroke-dasharray]="seg.dash + ' ' + seg.gap"
                        [attr.stroke-dashoffset]="seg.offset"
                        stroke-linecap="butt"
                        transform="rotate(-90 70 70)"/>
                    </ng-container>
                    <text x="70" y="66" text-anchor="middle" class="text-xs" font-size="10" fill="#6b7280">Portfolio</text>
                    <text x="70" y="80" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937">{{ totalCurrent | currencySymbol:0 }}</text>
                  </svg>
                </div>
                <!-- Legend -->
                <div class="space-y-1.5">
                  <div *ngFor="let seg of donutSegments" class="flex items-center justify-between text-xs">
                    <div class="flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full shrink-0" [style.background]="seg.color"></span>
                      <span class="text-gray-600">{{ seg.type }}</span>
                    </div>
                    <span class="font-semibold text-gray-700">{{ seg.pct.toFixed(1) }}%</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Add/Edit Form -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm font-semibold text-gray-700">{{ editingId ? 'Edit Investment' : 'Add Investment' }}</h3>
                <button *ngIf="showForm" (click)="cancelEdit()" class="text-xs text-gray-400 hover:text-gray-600">✕ Cancel</button>
                <button *ngIf="!showForm" (click)="toggleForm()" class="text-xs text-purple-600 font-semibold hover:text-purple-800">+ New</button>
              </div>

              <div *ngIf="!showForm" class="flex flex-col items-center justify-center h-40 text-gray-300">
                <svg class="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/>
                </svg>
                <p class="text-xs">Click "+ New" or the header button to add</p>
              </div>

              <div *ngIf="showForm">
                <!-- Ticker lookup -->
                <div class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p class="text-xs font-semibold text-blue-700 mb-2">🔍 Live Price Lookup (Stocks / ETFs / Crypto)</p>
                  <div class="flex gap-2">
                    <input [(ngModel)]="tickerSymbol" [ngModelOptions]="{standalone: true}"
                      type="text" placeholder="e.g. AAPL, BTC-USD, VWCE.DE"
                      class="flex-1 px-3 py-2 border border-blue-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      style="text-transform:uppercase"
                      (keydown.enter)="fetchPrice()" />
                    <button type="button" (click)="fetchPrice()" [disabled]="fetchingPrice || !tickerSymbol"
                      class="px-3 py-2 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                      {{ fetchingPrice ? '...' : 'Get Price' }}
                    </button>
                  </div>
                  <div *ngIf="quoteResult" class="mt-2 flex items-center justify-between text-xs text-blue-800">
                    <span>{{ quoteResult.name }} — <strong>{{ quoteResult.price }} {{ quoteResult.currency }}</strong></span>
                    <button type="button" (click)="applyQuote()" class="text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors ml-2">Use →</button>
                  </div>
                  <p *ngIf="quoteError" class="mt-1 text-xs text-red-500">{{ quoteError }}</p>
                </div>

                <form [formGroup]="investmentForm" (ngSubmit)="onSubmit()">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">Name</label>
                      <input formControlName="name" type="text" placeholder="e.g., Apple Inc."
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select formControlName="type"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                        <option value="">Select type</option>
                        <option *ngFor="let t of investmentTypes" [value]="t">{{ typeIcon(t) }} {{ t }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">Amount Invested ({{ currencyService.symbol }})</label>
                      <input formControlName="initial_amount" type="number" step="0.01" min="0" placeholder="0.00"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 mb-1">Current Value ({{ currencyService.symbol }})</label>
                      <input formControlName="current_amount" type="number" step="0.01" min="0" placeholder="0.00"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                    <div class="sm:col-span-2">
                      <label class="block text-xs font-medium text-gray-600 mb-1">Purchase Date</label>
                      <input formControlName="purchase_date" type="date"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
                    </div>
                  </div>
                  <p *ngIf="errorMessage" class="mt-2 text-red-500 text-xs">{{ errorMessage }}</p>
                  <div class="mt-3 flex gap-2">
                    <button type="submit" [disabled]="investmentForm.invalid || isSaving"
                      class="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
                      {{ isSaving ? 'Saving...' : (editingId ? 'Update' : 'Add Investment') }}
                    </button>
                    <button type="button" (click)="cancelEdit()"
                      class="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <!-- Search + Filter bar -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
            <div class="flex flex-col sm:flex-row gap-3">
              <div class="relative flex-1">
                <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                </svg>
                <input type="text" placeholder="Search investments..."
                  [(ngModel)]="searchQuery" [ngModelOptions]="{standalone: true}"
                  class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <select [(ngModel)]="filterType" [ngModelOptions]="{standalone: true}"
                class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                <option value="">All types</option>
                <option *ngFor="let t of investmentTypes" [value]="t">{{ typeIcon(t) }} {{ t }}</option>
              </select>
              <select [(ngModel)]="filterPerf" [ngModelOptions]="{standalone: true}"
                class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                <option value="">All performance</option>
                <option value="gain">Gains only</option>
                <option value="loss">Losses only</option>
              </select>
            </div>
            <p class="text-xs text-gray-400 mt-2">{{ filteredInvestments.length }} investment{{ filteredInvestments.length !== 1 ? 's' : '' }}</p>
          </div>

          <!-- Investments List -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100">

            <!-- Empty state -->
            <div *ngIf="!isLoading && investments.length === 0" class="text-center py-16 px-4">
              <div class="w-16 h-16 mx-auto bg-purple-50 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                </svg>
              </div>
              <h3 class="text-gray-700 font-semibold mb-1">No investments yet</h3>
              <p class="text-gray-400 text-sm mb-4">Track your stocks, ETFs, crypto and more</p>
              <button (click)="toggleForm()"
                class="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors">
                + Add your first investment
              </button>
            </div>

            <!-- Loading skeleton -->
            <div *ngIf="isLoading" class="divide-y divide-gray-50">
              <div *ngFor="let _ of [1,2,3]" class="px-6 py-4 animate-pulse flex gap-3">
                <div class="w-10 h-10 bg-gray-100 rounded-xl shrink-0"></div>
                <div class="flex-1 space-y-2 py-1">
                  <div class="h-3 bg-gray-100 rounded w-1/3"></div>
                  <div class="h-2.5 bg-gray-100 rounded w-1/4"></div>
                </div>
                <div class="w-16 h-8 bg-gray-100 rounded-lg shrink-0"></div>
              </div>
            </div>

            <!-- Investment rows -->
            <div *ngFor="let inv of filteredInvestments; let last = last"
              class="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
              [class.border-b]="!last" [class.border-gray-100]="!last">
              <div class="flex items-start gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-lg"
                  [style.background]="typeColor(inv.type) + '20'">
                  {{ typeIcon(inv.type) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="font-medium text-gray-800 truncate">{{ inv.name }}</p>
                      <p class="text-xs text-gray-400">{{ inv.type }} · {{ inv.purchase_date | date:'mediumDate' }}</p>
                    </div>
                    <span class="inline-block px-2 py-1 rounded-lg text-xs font-bold shrink-0"
                      [class]="roi(inv) >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
                      {{ roi(inv) >= 0 ? '+' : '' }}{{ roi(inv).toFixed(1) }}%
                    </span>
                  </div>
                  <div class="flex items-center gap-4 mt-2 flex-wrap">
                    <div class="hidden sm:block">
                      <p class="text-xs text-gray-400">Invested</p>
                      <p class="text-sm font-medium text-gray-700">{{ +inv.initial_amount | currencySymbol }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400">Current</p>
                      <p class="text-sm font-semibold text-blue-600">{{ +inv.current_amount | currencySymbol }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-gray-400">Gain/Loss</p>
                      <p class="text-sm font-semibold" [class]="gain(inv) >= 0 ? 'text-green-600' : 'text-red-600'">
                        {{ gain(inv) >= 0 ? '+' : '' }}{{ gain(inv) | currencySymbol }}
                      </p>
                    </div>
                    <!-- Progress bar -->
                    <div class="flex-1 min-w-16 hidden sm:block">
                      <div class="w-full bg-gray-100 rounded-full h-1.5">
                        <div class="h-1.5 rounded-full transition-all"
                          [style.width]="Math.min(100, (+inv.current_amount / +inv.initial_amount) * 100) + '%'"
                          [class]="roi(inv) >= 0 ? 'bg-green-400' : 'bg-red-400'"></div>
                      </div>
                    </div>
                    <div class="ml-auto flex gap-1">
                      <button (click)="editInvestment(inv)" class="p-1.5 text-gray-400 hover:text-purple-600 transition-colors" title="Edit">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button (click)="deleteInvestment(inv.id)" class="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- No filter results -->
            <div *ngIf="!isLoading && investments.length > 0 && filteredInvestments.length === 0"
              class="text-center py-10 text-gray-400 text-sm">
              No investments match your search.
            </div>
          </div>

          <!-- ===== MARKET EXPLORER ===== -->
          <div class="mt-8">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-800">Market Explorer</h2>
              <span class="text-xs text-gray-400">Powered by CoinGecko &amp; Yahoo Finance</span>
            </div>

            <!-- Tabs -->
            <div class="flex gap-1 bg-gray-200 p-1 rounded-xl w-fit mb-5">
              <button (click)="marketTab = 'crypto'"
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                [class.bg-white]="marketTab === 'crypto'"
                [class.shadow-sm]="marketTab === 'crypto'"
                [class.text-gray-800]="marketTab === 'crypto'"
                [class.text-gray-500]="marketTab !== 'crypto'">
                🪙 Crypto
              </button>
              <button (click)="marketTab = 'stocks'"
                class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                [class.bg-white]="marketTab === 'stocks'"
                [class.shadow-sm]="marketTab === 'stocks'"
                [class.text-gray-800]="marketTab === 'stocks'"
                [class.text-gray-500]="marketTab !== 'stocks'">
                📈 Stocks &amp; ETFs
              </button>
            </div>

            <!-- CRYPTO TAB -->
            <div *ngIf="marketTab === 'crypto'">
              <!-- Controls -->
              <div class="flex flex-col sm:flex-row gap-3 mb-4">
                <div class="relative flex-1">
                  <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                  <input type="text" placeholder="Search coin (e.g. Bitcoin, ETH)..."
                    [(ngModel)]="cryptoSearch" [ngModelOptions]="{standalone:true}"
                    class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white" />
                </div>
                <select [(ngModel)]="cryptoFilter" [ngModelOptions]="{standalone:true}"
                  class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white">
                  <option value="">All</option>
                  <option value="gain">Gainers 📈</option>
                  <option value="loss">Losers 📉</option>
                </select>
                <button (click)="loadCrypto()"
                  [disabled]="cryptoLoading"
                  class="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 disabled:opacity-50 transition-colors whitespace-nowrap">
                  {{ cryptoLoading ? 'Loading...' : '↻ Refresh' }}
                </button>
              </div>

              <p *ngIf="cryptoError" class="text-red-500 text-sm mb-3">{{ cryptoError }}</p>

              <!-- Loading skeleton -->
              <div *ngIf="cryptoLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div *ngFor="let _ of [1,2,3,4,5,6]" class="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-9 h-9 bg-gray-100 rounded-full"></div>
                    <div class="flex-1 space-y-1.5">
                      <div class="h-3 bg-gray-100 rounded w-1/2"></div>
                      <div class="h-2.5 bg-gray-100 rounded w-1/3"></div>
                    </div>
                    <div class="h-4 bg-gray-100 rounded w-12"></div>
                  </div>
                  <div class="h-10 bg-gray-100 rounded"></div>
                </div>
              </div>

              <!-- Coin cards -->
              <div *ngIf="!cryptoLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div *ngFor="let coin of filteredCoins"
                  class="bg-white rounded-xl p-4 border border-gray-100 hover:border-yellow-200 hover:shadow-md transition-all">
                  <div class="flex items-center gap-3 mb-2">
                    <img [src]="coin.image" [alt]="coin.name" class="w-8 h-8 rounded-full" />
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-gray-800 text-sm truncate">{{ coin.name }}</p>
                      <p class="text-xs text-gray-400 uppercase">{{ coin.symbol }}</p>
                    </div>
                    <div class="text-right">
                      <p class="font-bold text-gray-800 text-sm">{{ '$' + formatPrice(coin.current_price) }}</p>
                      <p class="text-xs font-semibold"
                        [class.text-green-500]="coin.price_change_percentage_24h >= 0"
                        [class.text-red-500]="coin.price_change_percentage_24h < 0">
                        {{ coin.price_change_percentage_24h >= 0 ? '+' : '' }}{{ coin.price_change_percentage_24h?.toFixed(2) }}%
                      </p>
                    </div>
                  </div>

                  <!-- Sparkline SVG -->
                  <div class="h-12 mb-2" *ngIf="coin.sparkline_in_7d?.price?.length">
                    <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="w-full h-full">
                      <polyline
                        [attr.points]="sparklinePoints(coin.sparkline_in_7d.price)"
                        fill="none"
                        stroke-width="1.5"
                        [attr.stroke]="coin.price_change_percentage_24h >= 0 ? '#22c55e' : '#ef4444'"
                      />
                    </svg>
                  </div>

                  <div class="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span>Mkt cap: {{ '$' + formatBigNum(coin.market_cap) }}</span>
                    <span>Rank #{{ coin.market_cap_rank }}</span>
                  </div>

                  <button (click)="prefillFromCoin(coin)"
                    class="w-full text-xs py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-medium transition-colors">
                    + Add to Portfolio
                  </button>
                </div>
              </div>

              <p *ngIf="!cryptoLoading && filteredCoins.length === 0 && coins.length > 0" class="text-center text-gray-400 text-sm py-6">No coins match your search.</p>
            </div>

            <!-- STOCKS & ETFs TAB -->
            <div *ngIf="marketTab === 'stocks'">
              <!-- Popular tickers -->
              <div class="mb-4">
                <p class="text-xs text-gray-500 mb-2 font-medium">Popular tickers</p>
                <div class="flex flex-wrap gap-2">
                  <button *ngFor="let t of popularTickers"
                    (click)="stockSearch = t; fetchStockQuote()"
                    class="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:border-purple-300 hover:text-purple-700 transition-colors">
                    {{ t }}
                  </button>
                </div>
              </div>

              <!-- Search input -->
              <div class="flex gap-2 mb-5">
                <div class="relative flex-1">
                  <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                  </svg>
                  <input type="text" placeholder="Ticker symbol (e.g. AAPL, VWCE.DE, MSFT)"
                    [(ngModel)]="stockSearch" [ngModelOptions]="{standalone:true}"
                    (keydown.enter)="fetchStockQuote()"
                    style="text-transform:uppercase"
                    class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white" />
                </div>
                <button (click)="fetchStockQuote()" [disabled]="stockLoading || !stockSearch"
                  class="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap">
                  {{ stockLoading ? 'Fetching...' : 'Search' }}
                </button>
              </div>

              <p *ngIf="stockError" class="text-red-500 text-sm mb-3">{{ stockError }}</p>

              <!-- Quote card -->
              <div *ngIf="stockQuote" class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 max-w-sm">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <p class="font-bold text-gray-800">{{ stockQuote.name }}</p>
                    <p class="text-xs text-gray-400 uppercase">{{ stockSearch }} · {{ stockQuote.exchange }}</p>
                  </div>
                  <span class="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full font-medium">Live</span>
                </div>
                <p class="text-3xl font-bold text-gray-900 mb-1">{{ stockQuote.price }} <span class="text-base text-gray-400">{{ stockQuote.currency }}</span></p>
                <button (click)="prefillFromStock()"
                  class="mt-3 w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors">
                  + Add to Portfolio
                </button>
              </div>

              <div *ngIf="!stockQuote && !stockLoading && !stockError" class="text-center py-12 text-gray-300">
                <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <p class="text-sm">Search a ticker to see live data</p>
              </div>
            </div>
          </div>
          <!-- ===== END MARKET EXPLORER ===== -->

        </div>
      </main>
    </div>
  `
})
export class InvestmentsComponent implements OnInit {
  investments: any[] = [];
  investmentForm: FormGroup;
  investmentTypes = INVESTMENT_TYPES;
  showForm = false;
  editingId: number | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  loadError = '';

  totalInitial = 0;
  totalCurrent = 0;
  totalGain = 0;
  totalRoi = 0;

  searchQuery = '';
  filterType = '';
  filterPerf = '';

  donutSegments: { type: string; color: string; pct: number; dash: number; gap: number; offset: number }[] = [];
  readonly Math = Math;

  tickerSymbol = '';
  fetchingPrice = false;
  quoteResult: { name: string; price: number; currency: string; exchange: string } | null = null;
  quoteError = '';

  // Market explorer
  marketTab: 'crypto' | 'stocks' = 'crypto';

  // Crypto
  coins: any[] = [];
  cryptoLoading = false;
  cryptoError = '';
  cryptoSearch = '';
  cryptoFilter = '';

  // Stocks
  popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'VOO', 'SPY', 'QQQ', 'VWCE.DE', 'IWDA.AS', 'BRK-B'];
  stockSearch = '';
  stockLoading = false;
  stockError = '';
  stockQuote: { name: string; price: number; currency: string; exchange: string } | null = null;

  private apiUrl = environment.apiUrl;

  constructor(
    private fb: FormBuilder,
    private financialService: FinancialService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    public currencyService: CurrencyService
  ) {
    this.investmentForm = this.fb.group({
      name: ['', Validators.required],
      type: ['', Validators.required],
      initial_amount: ['', [Validators.required, Validators.min(0)]],
      current_amount: ['', [Validators.required, Validators.min(0)]],
      purchase_date: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadInvestments();
    this.loadCrypto();
  }

  loadInvestments(forceRefresh = false): void {
    this.isLoading = true;
    this.loadError = '';
    this.financialService.getInvestments(forceRefresh).subscribe({
      next: (data) => {
        this.investments = data;
        this.recalcTotals();
        this.isLoading = false;
      },
      error: (err: any) => {
        this.isLoading = false;
        const status = err?.status ? ' (HTTP ' + err.status + ')' : '';
        this.loadError = (err?.message || err?.error?.message || JSON.stringify(err) || 'Failed to load investments') + status;
      }
    });
  }

  toggleForm(): void {
    if (this.showForm && !this.editingId) {
      this.cancelEdit();
    } else {
      this.showForm = true;
    }
  }

  fetchPrice(): void {
    if (!this.tickerSymbol) return;
    this.fetchingPrice = true;
    this.quoteResult = null;
    this.quoteError = '';

    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authService.getTokenValue() });
    this.http.get<any>(this.apiUrl + '/market/quote', {
      headers,
      params: { symbol: this.tickerSymbol.toUpperCase() }
    }).subscribe({
      next: (data) => {
        this.fetchingPrice = false;
        this.quoteResult = data;
      },
      error: (err) => {
        this.fetchingPrice = false;
        this.quoteError = err?.error?.error || 'Symbol not found. Try: AAPL, BTC-USD, VWCE.DE';
      }
    });
  }

  applyQuote(): void {
    if (!this.quoteResult) return;
    this.investmentForm.patchValue({
      name: this.quoteResult.name,
    });
    if (!this.investmentForm.get('type')?.value) {
      const sym = this.tickerSymbol.toUpperCase();
      const type = sym.includes('-USD') || sym.includes('-EUR') ? 'Crypto' : 'Stocks';
      this.investmentForm.patchValue({ type });
    }
  }

  get filteredInvestments(): any[] {
    return this.investments.filter(inv => {
      const q = this.searchQuery.toLowerCase();
      if (q && !inv.name.toLowerCase().includes(q) && !inv.type.toLowerCase().includes(q)) return false;
      if (this.filterType && inv.type !== this.filterType) return false;
      if (this.filterPerf === 'gain' && this.roi(inv) < 0) return false;
      if (this.filterPerf === 'loss' && this.roi(inv) >= 0) return false;
      return true;
    });
  }

  recalcTotals(): void {
    this.totalInitial = this.investments.reduce((s, i) => s + +i.initial_amount, 0);
    this.totalCurrent = this.investments.reduce((s, i) => s + +i.current_amount, 0);
    this.totalGain = this.totalCurrent - this.totalInitial;
    this.totalRoi = this.totalInitial > 0 ? (this.totalGain / this.totalInitial) * 100 : 0;
    this.recalcDonut();
  }

  recalcDonut(): void {
    if (this.totalCurrent === 0) { this.donutSegments = []; return; }
    const circumference = 2 * Math.PI * 54;
    const grouped: Record<string, number> = {};
    for (const inv of this.investments) {
      grouped[inv.type] = (grouped[inv.type] || 0) + +inv.current_amount;
    }
    let offset = 0;
    this.donutSegments = Object.entries(grouped).map(([type, value]) => {
      const pct = (value / this.totalCurrent) * 100;
      const dash = (pct / 100) * circumference;
      const gap = circumference - dash;
      const seg = { type, color: TYPE_COLORS[type] || '#94a3b8', pct, dash, gap, offset };
      offset -= dash;
      return seg;
    });
  }

  typeColor(type: string): string {
    return TYPE_COLORS[type] || '#94a3b8';
  }

  roi(inv: any): number {
    const init = +inv.initial_amount;
    return init > 0 ? ((+inv.current_amount - init) / init) * 100 : 0;
  }

  gain(inv: any): number {
    return +inv.current_amount - +inv.initial_amount;
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      'Stocks': '📈', 'ETF': '📊', 'Crypto': '₿', 'Real Estate': '🏠',
      'Bonds': '📜', 'Savings Account': '🏦', 'Other': '💼'
    };
    return map[type] || '💼';
  }

  onSubmit(): void {
    if (this.investmentForm.invalid) return;
    this.isSaving = true;
    this.errorMessage = '';

    const obs = this.editingId
      ? this.financialService.updateInvestment(this.editingId, this.investmentForm.value)
      : this.financialService.createInvestment(this.investmentForm.value);

    obs.subscribe({
      next: () => { this.isSaving = false; this.loadInvestments(true); this.cancelEdit(); },
      error: (err: any) => { this.isSaving = false; this.errorMessage = err.message || 'Failed to save investment'; }
    });
  }

  editInvestment(inv: any): void {
    this.editingId = inv.id;
    this.investmentForm.patchValue({
      name: inv.name, type: inv.type,
      initial_amount: inv.initial_amount,
      current_amount: inv.current_amount,
      purchase_date: inv.purchase_date,
    });
    this.showForm = true;
    this.quoteResult = null;
    this.quoteError = '';
  }

  deleteInvestment(id: number): void {
    if (!confirm('Delete this investment?')) return;
    this.financialService.deleteInvestment(id).subscribe({
      next: () => this.loadInvestments(true),
      error: (err: any) => this.errorMessage = err.message || 'Failed to delete'
    });
  }

  cancelEdit(): void {
    this.editingId = null;
    this.showForm = false;
    this.errorMessage = '';
    this.quoteResult = null;
    this.quoteError = '';
    this.tickerSymbol = '';
    this.investmentForm.reset();
  }

  // ---- Crypto (CoinGecko) ----
  loadCrypto(): void {
    this.cryptoLoading = true;
    this.cryptoError = '';
    this.http.get<any[]>(
      'https://api.coingecko.com/api/v3/coins/markets',
      { params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: '30',
          page: '1',
          sparkline: 'true',
          price_change_percentage: '24h'
        }
      }
    ).subscribe({
      next: (data) => { this.coins = data; this.cryptoLoading = false; },
      error: () => {
        this.cryptoLoading = false;
        this.cryptoError = 'Failed to load crypto data. CoinGecko may be rate-limiting — try again in a minute.';
      }
    });
  }

  get filteredCoins(): any[] {
    return this.coins.filter(c => {
      const q = this.cryptoSearch.toLowerCase();
      if (q && !c.name.toLowerCase().includes(q) && !c.symbol.toLowerCase().includes(q)) return false;
      if (this.cryptoFilter === 'gain' && c.price_change_percentage_24h < 0) return false;
      if (this.cryptoFilter === 'loss' && c.price_change_percentage_24h >= 0) return false;
      return true;
    });
  }

  sparklinePoints(prices: number[]): string {
    if (!prices?.length) return '';
    const step = prices.length > 1 ? 100 / (prices.length - 1) : 0;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    return prices.map((p, i) => (i * step).toFixed(1) + ',' + (40 - ((p - min) / range) * 36).toFixed(1)).join(' ');
  }

  formatPrice(p: number): string {
    if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return p.toFixed(6);
  }

  formatBigNum(n: number): string {
    if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    return n.toLocaleString();
  }

  prefillFromCoin(coin: any): void {
    this.showForm = true;
    this.editingId = null;
    this.investmentForm.patchValue({
      name: coin.name,
      type: 'Crypto',
      purchase_date: new Date().toISOString().slice(0, 10),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- Stocks / ETFs (Yahoo via backend) ----
  fetchStockQuote(): void {
    if (!this.stockSearch) return;
    this.stockLoading = true;
    this.stockError = '';
    this.stockQuote = null;
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.authService.getTokenValue() });
    this.http.get<any>(this.apiUrl + '/market/quote', {
      headers,
      params: { symbol: this.stockSearch.toUpperCase() }
    }).subscribe({
      next: (data) => { this.stockQuote = data; this.stockLoading = false; },
      error: (err) => {
        this.stockLoading = false;
        this.stockError = err?.error?.error || ('"' + this.stockSearch + '" not found. Try a valid ticker like AAPL or VOO.');
      }
    });
  }

  prefillFromStock(): void {
    if (!this.stockQuote) return;
    this.showForm = true;
    this.editingId = null;
    const sym = this.stockSearch.toUpperCase();
    this.investmentForm.patchValue({
      name: this.stockQuote.name,
      type: sym.includes('ETF') || ['VOO','SPY','QQQ','VWCE.DE','IWDA.AS'].includes(sym) ? 'ETF' : 'Stocks',
      purchase_date: new Date().toISOString().slice(0, 10),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
