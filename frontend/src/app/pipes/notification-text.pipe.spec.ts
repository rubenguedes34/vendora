import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AppNotification } from '../services/notification.service';
import { LanguageService } from '../services/language.service';
import { NotificationTextPipe } from './notification-text.pipe';

describe('NotificationTextPipe', () => {
  const n = {
    title: 'T',
    body: 'B',
    data: { i18n: { key: 'savings_goal_completed', params: { saved: '$1,234.56' } } },
  } as unknown as AppNotification;

  it('re-formats english-style amounts for pt', async () => {
    const language = TestBed.inject(LanguageService);
    language.set('pt', false);
    await new Promise((r) => TestBed.inject(TranslateService).use('pt').subscribe(r));
    const text = TestBed.runInInjectionContext(() => new NotificationTextPipe()).transform(
      n,
      'body',
    );
    expect(text).toContain('$1234,56');
    expect(text).not.toContain('1,234.56');
  });
});
