import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt-PT';
import localeEnGB from '@angular/common/locales/en-GB';
import { TestBed } from '@angular/core/testing';
import { provideTestTranslate } from './testing/translate-testing';

registerLocaleData(localePt);
registerLocaleData(localeEnGB);

// Every spec gets translations; specs that call resetTestingModule() re-add provideTestTranslate().
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideTestTranslate()] });
});
