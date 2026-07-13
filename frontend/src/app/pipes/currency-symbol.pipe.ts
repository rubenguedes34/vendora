import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

@Pipe({
  name: 'currencySymbol',
  standalone: true,
  pure: false,
})
export class CurrencySymbolPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(value: number | string | null | undefined, decimals = 2): string {
    const num = parseFloat(value as string) || 0;
    return this.currencyService.symbol + num.toFixed(decimals);
  }
}
