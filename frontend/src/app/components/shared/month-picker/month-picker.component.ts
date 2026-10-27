import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';

/** Month navigator + popup grid, same look as the dashboard's. `month` is 'YYYY-MM' ('' = all). */
@Component({
  selector: 'app-month-picker',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [NgClass, TranslatePipe],
  templateUrl: './month-picker.component.html',
})
export class MonthPickerComponent {
  private translate = inject(TranslateService);
  private language = inject(LanguageService);

  readonly month = model('');
  readonly allowAll = input(false);

  readonly currentMonth = new Date().toISOString().slice(0, 7);
  readonly open = signal(false);
  readonly pickerYear = signal(new Date().getFullYear());

  readonly label = computed(() =>
    this.month()
      ? this.name(this.month(), 'long', true)
      : this.translate.instant('transactions.allMonths'),
  );

  readonly months = computed(() =>
    Array.from({ length: 12 }, (_, i) => `${this.pickerYear()}-${String(i + 1).padStart(2, '0')}`),
  );

  name(month: string, style: 'long' | 'short', withYear = false): string {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(this.language.locale, {
      month: style,
      ...(withYear && { year: 'numeric' }),
    });
  }

  toggle(): void {
    this.open.update((o) => !o);
    if (this.month()) this.pickerYear.set(+this.month().slice(0, 4));
  }

  shift(delta: number): void {
    const [y, m] = (this.month() || this.currentMonth).split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.pick(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  pick(month: string): void {
    this.open.set(false);
    this.month.set(month);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('app-month-picker')) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
