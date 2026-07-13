import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CurrencyService, CurrencyOption } from '../../../services/currency.service';

@Component({
  selector: 'app-currency-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <!-- Collapsed row -->
      <button type="button" (click)="open = !open"
        class="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-primary-600 transition-colors">
        <div class="flex items-center gap-2.5">
          <svg class="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm font-semibold">Currency</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs opacity-70">{{ active.code }}</span>
          <span class="text-sm font-bold opacity-90">{{ active.symbol }}</span>
          <svg class="w-3.5 h-3.5 opacity-60 transition-transform"
            [class.rotate-180]="open"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </button>

      <!-- Expanded list -->
      <div *ngIf="open" class="mt-2 rounded-lg overflow-hidden border border-primary-400/40">
        <button
          *ngFor="let c of currencies"
          type="button"
          (click)="select(c.code)"
          class="w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-primary-600"
          [class.bg-primary-700]="active.code === c.code">
          <span class="font-medium">{{ c.label }}</span>
          <span class="font-bold opacity-90">{{ c.symbol }}</span>
        </button>
      </div>
    </div>
  `,
})
export class CurrencyPickerComponent implements OnInit {
  currencies: CurrencyOption[] = [];
  active!: CurrencyOption;
  open = false;

  constructor(private currencyService: CurrencyService) {}

  ngOnInit(): void {
    this.currencies = this.currencyService.currencies;
    this.active = this.currencyService.current;
    this.currencyService.currency$.subscribe(c => this.active = c);
  }

  select(code: string): void {
    this.currencyService.setCurrency(code);
    this.open = false;
  }
}
