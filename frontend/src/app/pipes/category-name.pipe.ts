import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/** Seeded categories ("Emergency Fund") are translated via `categories.emergencyFund`; custom ones pass through. */
export function categoryLabel(name: string, translate: TranslateService): string {
  const slug = name
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w))
    .join('');
  const key = `categories.${slug}`;
  const translated = translate.instant(key);
  return translated === key ? name : translated;
}

/** Sorted by the name the user sees (translated), not the stored English one. */
export function sortByCategoryName<T extends { name: string }>(
  categories: T[],
  translate: TranslateService,
): T[] {
  return [...categories].sort((a, b) =>
    categoryLabel(a.name, translate).localeCompare(categoryLabel(b.name, translate)),
  );
}

@Pipe({
  name: 'categoryName',
  standalone: true,
  pure: false,
})
export class CategoryNamePipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(name: string | null | undefined): string {
    return name ? categoryLabel(name, this.translate) : '';
  }
}
