import { Pipe, PipeTransform, inject } from '@angular/core';
import { CurrencyService } from '../services/currency.service';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'currencySymbol',
  standalone: true,
  pure: false,
})
export class CurrencySymbolPipe implements PipeTransform {
  private language = inject(LanguageService);

  constructor(private currencyService: CurrencyService) {}

  transform(value: number | string | null | undefined, decimals = 2): string {
    const num = parseFloat(value as string) || 0;
    // Portuguese convention puts the symbol after the number ("1234,56 €"); English output is unchanged.
    if (this.language.current === 'pt') {
      return new Intl.NumberFormat(this.language.locale, {
        style: 'currency',
        currency: this.currencyService.current.code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
    }
    return this.currencyService.symbol + num.toFixed(decimals);
  }
}
