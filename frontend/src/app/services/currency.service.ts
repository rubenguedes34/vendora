import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class CurrencyService {
  private readonly storageKey = 'vendora-currency';

  readonly currencies: CurrencyOption[] = [
    { code: 'EUR', symbol: '€', label: 'Euro' },
    { code: 'USD', symbol: '$', label: 'US Dollar' },
    { code: 'GBP', symbol: '£', label: 'British Pound' },
    { code: 'CHF', symbol: '₣', label: 'Swiss Franc' },
    { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
    { code: 'BRL', symbol: 'R$', label: 'Brazilian Real' },
    { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  ];

  private currentCurrency = new BehaviorSubject<CurrencyOption>(this.loadSaved());

  readonly currency$ = this.currentCurrency.asObservable();

  private loadSaved(): CurrencyOption {
    if (typeof window === 'undefined') return this.currencies[0];
    const saved = localStorage.getItem(this.storageKey);
    return this.currencies.find(c => c.code === saved) ?? this.currencies[0];
  }

  get current(): CurrencyOption {
    return this.currentCurrency.value;
  }

  get symbol(): string {
    return this.currentCurrency.value.symbol;
  }

  get code(): string {
    return this.currentCurrency.value.code;
  }

  setCurrency(code: string): void {
    const found = this.currencies.find(c => c.code === code);
    if (!found) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, code);
    }
    this.currentCurrency.next(found);
  }
}
