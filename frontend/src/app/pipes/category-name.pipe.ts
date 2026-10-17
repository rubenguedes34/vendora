import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/** Seeded categories ("Emergency Fund") are translated via `categories.emergencyFund`; custom ones pass through. */
@Pipe({
  name: 'categoryName',
  standalone: true,
  pure: false,
})
export class CategoryNamePipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(name: string | null | undefined): string {
    if (!name) return '';
    const slug = name
      .toLowerCase()
      .split(/\s+/)
      .map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w))
      .join('');
    const key = `categories.${slug}`;
    const translated = this.translate.instant(key);
    return translated === key ? name : translated;
  }
}
