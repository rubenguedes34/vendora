import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WatchlistItem, WatchlistService } from '../../services/watchlist.service';
import { MarketDataService, MarketQuote, MarketSearchResult } from '../../services/market-data.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

interface EnrichedItem extends WatchlistItem {
  quote?: MarketQuote;
  loading?: boolean;
  error?: string;
}

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <ng-container *ngIf="!embedded; else embeddedTpl">
      <div class="min-h-screen bg-gray-100 flex">
        <app-sidebar></app-sidebar>

        <main class="flex-1 overflow-auto pt-14 lg:pt-0 pb-20 lg:pb-0">
          <ng-container *ngTemplateOutlet="contentTpl"></ng-container>
        </main>
      </div>
    </ng-container>

    <ng-template #embeddedTpl>
      <ng-container *ngTemplateOutlet="contentTpl"></ng-container>
    </ng-template>

    <ng-template #contentTpl>
        <header class="bg-primary-700 text-white shadow-md">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <div>
                <h2 class="text-xl font-semibold">Watchlist</h2>
                <p class="text-primary-200 text-xs">Track your favorite assets and their live prices</p>
              </div>
              <button (click)="refreshAll()" [disabled]="refreshing"
                class="flex items-center gap-1.5 text-xs bg-primary-600 hover:bg-primary-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                <svg class="w-3.5 h-3.5" [class.animate-spin]="refreshing" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-5">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Add Asset</h3>
            <div class="flex flex-col sm:flex-row gap-2">
              <div class="relative flex-1">
                <svg class="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
                </svg>
                <input [(ngModel)]="searchQuery"
                  (ngModelChange)="searchSubject.next($event)"
                  type="text"
                  placeholder="Search assets (e.g. Apple, BTC-USD, VWCE)..."
                  class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white" />
              </div>
              <button (click)="addFromSearch()" [disabled]="!selectedResult || adding"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {{ adding ? '…' : 'Add' }}
              </button>
            </div>

            <!-- Search results -->
            <div *ngIf="searchResults.length" class="mt-3 border border-gray-100 rounded-lg divide-y divide-gray-50 max-h-60 overflow-auto">
              <button *ngFor="let result of searchResults" type="button" (click)="selectResult(result)"
                class="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-50 text-left transition-colors"
                [class.bg-primary-50]="selectedResult?.symbol === result.symbol">
                <div>
                  <p class="text-sm font-semibold text-gray-800">{{ result.symbol }}</p>
                  <p class="text-xs text-gray-500">{{ result.name }} · {{ result.exchange }}</p>
                </div>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  [class.bg-blue-50]="result.type==='Stocks'" [class.text-blue-600]="result.type==='Stocks'"
                  [class.bg-orange-50]="result.type==='ETF'" [class.text-orange-600]="result.type==='ETF'"
                  [class.bg-yellow-50]="result.type==='Crypto'" [class.text-yellow-700]="result.type==='Crypto'">
                  {{ result.type }}
                </span>
              </button>
            </div>
            <p *ngIf="searching" class="mt-2 text-xs text-gray-400 flex items-center gap-2">
              <span class="w-3 h-3 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin"></span>
              Searching…
            </p>
            <p *ngIf="searchError" class="mt-2 text-xs text-red-500">{{ searchError }}</p>

            <!-- Custom ticker -->
            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="flex items-center gap-2">
                <input [(ngModel)]="customSymbol"
                  type="text" placeholder="Or type a ticker manually"
                  class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white" />
                <button (click)="addCustom()" [disabled]="!customSymbol || adding"
                  class="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {{ adding ? '…' : 'Add Ticker' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Watchlist table -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th class="px-5 py-3 font-medium">Asset</th>
                    <th class="px-5 py-3 font-medium">Type</th>
                    <th class="px-5 py-3 font-medium">Exchange</th>
                    <th class="px-5 py-3 font-medium text-right">Price</th>
                    <th class="px-5 py-3 font-medium text-right">24h %</th>
                    <th class="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr *ngFor="let item of enrichedItems" class="hover:bg-gray-50">
                    <td class="px-5 py-3">
                      <div class="flex items-center gap-3">
                        <div *ngIf="item.quote?.logo" class="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          <img [src]="item.quote!.logo" [alt]="item.symbol" class="w-6 h-6 object-contain" />
                        </div>
                        <div *ngIf="!item.quote?.logo"
                          class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          [style.background-color]="typeColor(item.type)">
                          {{ item.symbol.slice(0,1) }}
                        </div>
                        <div>
                          <p class="font-semibold text-gray-800">{{ item.symbol }}</p>
                          <p class="text-xs text-gray-500">{{ item.name || item.symbol }}</p>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-3">
                      <span class="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        [class.bg-blue-50]="item.type==='Stocks'" [class.text-blue-600]="item.type==='Stocks'"
                        [class.bg-orange-50]="item.type==='ETF'" [class.text-orange-600]="item.type==='ETF'"
                        [class.bg-yellow-50]="item.type==='Crypto'" [class.text-yellow-700]="item.type==='Crypto'"
                        [style.background-color]="typeColor(item.type) + '22'"
                        [style.color]="typeColor(item.type)">
                        {{ item.type || 'Other' }}
                      </span>
                    </td>
                    <td class="px-5 py-3 text-gray-500">{{ item.exchange || '-' }}</td>
                    <td class="px-5 py-3 text-right">
                      <div *ngIf="item.loading" class="flex justify-end"><div class="w-4 h-4 border-2 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div></div>
                      <div *ngIf="!item.loading && item.quote">
                        <p class="font-semibold text-gray-800">{{ item.quote.price | number:'1.2-6' }}</p>
                        <p class="text-xs text-gray-500">{{ item.quote.currency }}</p>
                      </div>
                      <p *ngIf="!item.loading && !item.quote" class="text-xs text-gray-400">-</p>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <span *ngIf="item.quote?.change_24h != null"
                        class="text-xs font-bold px-2 py-0.5 rounded-full"
                        [class.bg-green-100]="item.quote!.change_24h! >= 0"
                        [class.text-green-700]="item.quote!.change_24h! >= 0"
                        [class.bg-red-100]="item.quote!.change_24h! < 0"
                        [class.text-red-700]="item.quote!.change_24h! < 0">
                        {{ item.quote!.change_24h! >= 0 ? '+' : '' }}{{ item.quote!.change_24h | number:'1.2-2' }}%
                      </span>
                      <span *ngIf="item.quote?.change_24h == null" class="text-xs text-gray-400">-</span>
                    </td>
                    <td class="px-5 py-3 text-right">
                      <button (click)="remove(item.id)" [disabled]="removing === item.id"
                        class="text-gray-400 hover:text-red-600 transition-colors p-1">
                        <svg *ngIf="removing !== item.id" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                        <div *ngIf="removing === item.id" class="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="enrichedItems.length === 0">
                    <td colspan="6" class="px-5 py-12 text-center text-gray-400 text-sm">
                      <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                      </svg>
                      Your watchlist is empty. Search for an asset above to add one.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
    </ng-template>
  `
})
export class WatchlistComponent implements OnInit, OnDestroy {
  @Input() embedded = false;

  items: WatchlistItem[] = [];
  enrichedItems: EnrichedItem[] = [];

  searchQuery = '';
  searchResults: MarketSearchResult[] = [];
  selectedResult: MarketSearchResult | null = null;
  searching = false;
  searchError = '';

  customSymbol = '';

  adding = false;
  removing: number | null = null;
  refreshing = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();
  searchSubject = new Subject<string>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private watchlistService: WatchlistService,
    private marketDataService: MarketDataService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.watchlistService.items$.pipe(takeUntil(this.destroy$)).subscribe(items => {
      this.items = items;
      this.enrichedItems = items.map(i => ({ ...i, loading: true }));
      this.refreshQuotes();
    });

    this.searchSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(q => this.doSearch(q));

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.watchlistService.load().subscribe({
      error: (e) => { this.errorMessage = e?.message || 'Failed to load watchlist'; }
    });
  }

  refreshAll(): void {
    this.refreshQuotes();
  }

  private refreshQuotes(): void {
    this.refreshing = true;
    let completed = 0;
    if (this.enrichedItems.length === 0) { this.refreshing = false; return; }

    this.enrichedItems.forEach((item, idx) => {
      this.marketDataService.quote(item.symbol).subscribe({
        next: (quote) => {
          this.enrichedItems[idx].quote = quote;
          this.enrichedItems[idx].loading = false;
        },
        error: (e) => {
          this.enrichedItems[idx].error = e?.message || 'Price unavailable';
          this.enrichedItems[idx].loading = false;
        },
        complete: () => {
          completed++;
          if (completed >= this.enrichedItems.length) this.refreshing = false;
        }
      });
    });
  }

  doSearch(q: string): void {
    this.searchResults = [];
    this.selectedResult = null;
    this.searchError = '';
    if (!q.trim()) { this.searching = false; return; }

    this.searching = true;
    this.marketDataService.search(q.trim()).subscribe({
      next: (results) => {
        this.searchResults = results.slice(0, 8);
        this.searching = false;
      },
      error: (e) => { this.searchError = e?.message || 'Search failed'; this.searching = false; }
    });
  }

  selectResult(result: MarketSearchResult): void {
    this.selectedResult = result;
    this.searchQuery = result.symbol;
    this.searchResults = [];
  }

  addFromSearch(): void {
    if (!this.selectedResult) return;
    const r = this.selectedResult;
    this.adding = true;
    this.watchlistService.add({
      symbol: r.symbol,
      name: r.name,
      type: r.type,
      exchange: r.exchange,
    }).subscribe({
      next: () => { this.resetSearch(); this.adding = false; },
      error: (e) => { this.errorMessage = e?.message || 'Failed to add asset'; this.adding = false; }
    });
  }

  addCustom(): void {
    const symbol = this.customSymbol.trim().toUpperCase();
    if (!symbol) return;
    this.adding = true;
    this.watchlistService.add({ symbol, name: symbol, type: null, exchange: null }).subscribe({
      next: () => { this.customSymbol = ''; this.adding = false; },
      error: (e) => { this.errorMessage = e?.message || 'Failed to add asset'; this.adding = false; }
    });
  }

  remove(id: number): void {
    this.removing = id;
    this.watchlistService.remove(id).subscribe({
      error: (e) => { this.errorMessage = e?.message || 'Failed to remove asset'; this.removing = null; },
      complete: () => { this.removing = null; }
    });
  }

  private resetSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedResult = null;
  }

  typeColor(type: string | null): string {
    switch (type) {
      case 'Stocks': return '#3b82f6';
      case 'ETF':    return '#f97316';
      case 'Crypto': return '#eab308';
      case 'Bonds':  return '#8b5cf6';
      default:       return '#6b7280';
    }
  }
}
