import 'zone.js';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt-PT';
import localeEnGB from '@angular/common/locales/en-GB';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// DatePipe/Intl need the locale data of every tag LanguageService.locale can return.
registerLocaleData(localePt);
registerLocaleData(localeEnGB);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
