import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export type Lang = 'en' | 'pt';

export interface LanguageOption {
  code: Lang;
  label: string;
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly storageKey = 'vendora-language';
  private translate = inject(TranslateService);
  private injector = inject(Injector);

  readonly languages: LanguageOption[] = [
    { code: 'en', label: 'EN' },
    { code: 'pt', label: 'PT' },
  ];

  private current$ = new BehaviorSubject<Lang>(this.loadSaved());

  readonly language$ = this.current$.asObservable();

  constructor() {
    this.translate.setFallbackLang('en');
    this.apply(this.current$.value);
  }

  get current(): Lang {
    return this.current$.value;
  }

  /** BCP 47 tag for Intl/DatePipe. */
  get locale(): string {
    return this.current === 'pt' ? 'pt-PT' : 'en-GB';
  }

  /** `remote` is false when the language comes from the server (login), to avoid echoing it back. */
  set(lang: Lang, remote = true): void {
    if (!this.languages.some((l) => l.code === lang)) return;
    try {
      localStorage.setItem(this.storageKey, lang);
    } catch {
      // storage blocked: the choice just lasts for this session
    }
    this.apply(lang);
    this.current$.next(lang);

    if (remote && localStorage.getItem('token')) {
      // HttpClient is resolved lazily: the auth interceptor depends on this service.
      this.injector
        .get(HttpClient)
        .put(`${environment.apiUrl}/user/locale`, { locale: lang })
        .subscribe({ error: () => undefined });
    }
  }

  /**
   * After login: a language already chosen on this device wins (and is pushed to the account);
   * otherwise the account's saved language is adopted.
   */
  syncWithUser(userLocale?: Lang): void {
    let hasLocalChoice = false;
    try {
      hasLocalChoice = localStorage.getItem(this.storageKey) !== null;
    } catch {
      // storage blocked: treat as no local choice
    }
    if (hasLocalChoice && userLocale !== this.current) {
      this.set(this.current);
    } else if (!hasLocalChoice && userLocale && userLocale !== this.current) {
      this.set(userLocale, false);
    }
  }

  private apply(lang: Lang): void {
    this.translate.use(lang);
    document.documentElement.lang = lang === 'pt' ? 'pt-PT' : 'en';
  }

  private loadSaved(): Lang {
    try {
      const saved = localStorage.getItem(this.storageKey);
      return saved === 'pt' ? 'pt' : 'en';
    } catch {
      return 'en';
    }
  }
}
