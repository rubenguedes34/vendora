import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyService } from '../services/currency.service';

/**
 * The backend writes amounts in notification text with a "$" because the currency is a client-side
 * preference; this swaps it for the user's chosen symbol.
 */
@Pipe({
  name: 'currencyText',
  standalone: true,
  pure: false,
})
export class CurrencyTextPipe implements PipeTransform {
  constructor(private currencyService: CurrencyService) {}

  transform(text: string | null | undefined): string {
    return (text ?? '').replace(/\$(?=\d)/g, () => this.currencyService.symbol);
  }
}
