import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppNotification } from '../services/notification.service';
import { LanguageService } from '../services/language.service';
import { CategoryNamePipe } from './category-name.pipe';

/**
 * Translates a notification from `data.i18n` ({ key, params }); old notifications, or keys this
 * client does not know, keep the stored English title/body. Apply `currencyText` to the result.
 */
@Pipe({
  name: 'notificationText',
  standalone: true,
  pure: false,
})
export class NotificationTextPipe implements PipeTransform {
  private translate = inject(TranslateService);
  private language = inject(LanguageService);
  private categoryName = new CategoryNamePipe();

  transform(n: AppNotification, part: 'title' | 'body'): string {
    const fallback = (part === 'title' ? n.title : n.body) ?? '';
    const i18n = n.data?.['i18n'] as { key?: string; params?: Record<string, string> } | undefined;
    if (!i18n?.key) return fallback;

    const params = { ...i18n.params };
    // The backend formats numbers English-style ("$1,234.56", "85.0%"); re-format them for pt.
    if (this.language.current === 'pt') {
      for (const [k, v] of Object.entries(params)) {
        const m = /^(\$?)(\d[\d,]*)(?:\.(\d+))?(%?)$/.exec(String(v));
        if (!m) continue;
        const digits = (m[3] ?? '').length;
        params[k] =
          m[1] +
          new Intl.NumberFormat(this.language.locale, {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits,
          }).format(Number(`${m[2].replace(/,/g, '')}.${m[3] ?? 0}`)) +
          m[4];
      }
    }
    if (params['category']) params['category'] = this.categoryName.transform(params['category']);
    if (params['date'])
      params['date'] = this.fmt(params['date'], { month: 'short', day: 'numeric' });
    if (params['month'])
      params['month'] = this.fmt(params['month'], { month: 'long', year: 'numeric' });

    const key = `notifications.items.${i18n.key}.${part}`;
    const text = this.translate.instant(key, params);
    return text === key ? fallback : text;
  }

  private fmt(value: string, opts: Intl.DateTimeFormatOptions): string {
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m) return value;
    return new Intl.DateTimeFormat(this.language.locale, opts).format(new Date(y, m - 1, d || 1));
  }
}
