import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { of } from 'rxjs';
import { I18N_NAMESPACES } from '../app/i18n/translate-loader';

// Real translation files, read synchronously, so specs see the same text as the app.
class FileTranslateLoader implements TranslateLoader {
  getTranslation(lang: string) {
    const all = Object.fromEntries(
      I18N_NAMESPACES.map((ns) => [
        ns,
        JSON.parse(readFileSync(join(process.cwd(), 'public/i18n', lang, `${ns}.json`), 'utf8')),
      ]),
    );
    return of(all);
  }
}

export const provideTestTranslate = () =>
  provideTranslateService({
    lang: 'en',
    fallbackLang: 'en',
    loader: { provide: TranslateLoader, useClass: FileTranslateLoader },
  });
