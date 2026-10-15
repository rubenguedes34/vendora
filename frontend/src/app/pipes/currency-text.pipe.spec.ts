import { CurrencyService } from '../services/currency.service';
import { CurrencyTextPipe } from './currency-text.pipe';

describe('CurrencyTextPipe', () => {
  const pipe = (symbol: string) => new CurrencyTextPipe({ symbol } as CurrencyService);

  it('replaces $ before a number with the chosen symbol', () => {
    expect(pipe('€').transform('You spent $2.00 of your limit of $1.00.')).toBe(
      'You spent €2.00 of your limit of €1.00.',
    );
  });

  it('leaves other text alone and handles null', () => {
    expect(pipe('€').transform('Costs in $ are fine')).toBe('Costs in $ are fine');
    expect(pipe('€').transform(null)).toBe('');
  });
});
