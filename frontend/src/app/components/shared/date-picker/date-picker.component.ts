import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../services/language.service';

const pad = (n: number): string => String(n).padStart(2, '0');
const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Day picker in the dashboard month-picker style. Value is 'YYYY-MM-DD' ('' = none). */
@Component({
  selector: 'app-date-picker',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [NgClass, TranslatePipe],
  templateUrl: './date-picker.component.html',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true },
  ],
})
export class DatePickerComponent implements ControlValueAccessor {
  private language = inject(LanguageService);

  readonly clearable = input(false);
  readonly ariaLabel = input('');
  /** Extra classes for the trigger, so each form keeps its own input look. */
  readonly triggerClass = input('');

  readonly value = signal('');
  readonly disabled = signal(false);
  readonly open = signal(false);
  readonly view = signal(new Date()); // any day inside the month being shown
  readonly today = iso(new Date());

  readonly label = computed(() =>
    this.value()
      ? new Date(`${this.value()}T00:00`).toLocaleDateString(this.language.locale, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '',
  );

  readonly title = computed(() =>
    this.view().toLocaleDateString(this.language.locale, { month: 'long', year: 'numeric' }),
  );

  readonly weekdays = computed(() =>
    Array.from({ length: 7 }, (_, i) =>
      new Date(2024, 0, 1 + i).toLocaleDateString(this.language.locale, { weekday: 'narrow' }),
    ),
  );

  /** 6 weeks starting on Monday; days outside the shown month are dimmed. */
  readonly days = computed(() => {
    const v = this.view();
    const first = new Date(v.getFullYear(), v.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { iso: iso(d), day: d.getDate(), outside: d.getMonth() !== v.getMonth() };
    });
  });

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string | null): void {
    this.value.set(v ? v.slice(0, 10) : '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  toggle(): void {
    if (this.disabled()) return;
    if (!this.open()) this.view.set(this.value() ? new Date(`${this.value()}T00:00`) : new Date());
    this.open.update((o) => !o);
  }

  shift(delta: number): void {
    const v = this.view();
    this.view.set(new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  pick(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !(event.target as HTMLElement).closest('app-date-picker')) {
      this.open.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.open.set(false);
  }
}
