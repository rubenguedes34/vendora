import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return TestBed.inject(LanguageService);
  };

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });

  afterEach(() => localStorage.clear());

  it('defaults to English', () => {
    const service = setup();
    expect(service.current).toBe('en');
    expect(service.locale).toBe('en-GB');
  });

  it('falls back to English when the stored value is invalid', () => {
    localStorage.setItem('vendora-language', 'fr');
    expect(setup().current).toBe('en');
  });

  it('persists the choice and updates <html lang> and the locale', () => {
    const service = setup();
    service.set('pt');
    expect(localStorage.getItem('vendora-language')).toBe('pt');
    expect(document.documentElement.lang).toBe('pt-PT');
    expect(service.locale).toBe('pt-PT');
  });

  it('adopts the account language when none was chosen on this device', () => {
    const service = setup();
    service.syncWithUser('pt');
    expect(service.current).toBe('pt');
  });

  it('keeps the device choice over the account language', () => {
    localStorage.setItem('vendora-language', 'en');
    const service = setup();
    service.syncWithUser('pt');
    expect(service.current).toBe('en');
  });
});
