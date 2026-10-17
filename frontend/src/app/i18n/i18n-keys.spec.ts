import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { I18N_NAMESPACES } from './translate-loader';

const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object'
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );

const load = (lang: string, ns: string) =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/i18n', lang, `${ns}.json`), 'utf8'));

describe('translation files', () => {
  for (const ns of I18N_NAMESPACES) {
    it(`en and pt have the same keys in "${ns}"`, () => {
      expect(flatten(load('pt', ns)).sort()).toEqual(flatten(load('en', ns)).sort());
    });
  }
});
