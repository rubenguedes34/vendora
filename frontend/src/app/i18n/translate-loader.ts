import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';

/** One JSON file per area under public/i18n/<lang>/, merged under the area name. */
export const I18N_NAMESPACES = [
  'common',
  'nav',
  'auth',
  'setup',
  'dashboard',
  'budget',
  'health',
  'transactions',
  'recurrent',
  'investments',
  'netWorth',
  'allocation',
  'notifications',
  'ai',
  'account',
  'categories',
  'errors',
] as const;

export class NamespacedTranslateLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  getTranslation(lang: string): Observable<TranslationObject> {
    const parts = I18N_NAMESPACES.map((ns) =>
      this.http.get<TranslationObject>(`./i18n/${lang}/${ns}.json`).pipe(
        map((body) => ({ [ns]: body })),
        // A missing area file just falls back to English.
        catchError(() => of({})),
      ),
    );
    return forkJoin(parts).pipe(map((all) => Object.assign({}, ...all)));
  }
}
