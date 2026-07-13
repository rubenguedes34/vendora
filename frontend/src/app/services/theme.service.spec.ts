import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('provides a list of theme options including teal', () => {
    expect(service.themes.length).toBeGreaterThan(0);
    expect(service.themes.some(t => t.id === 'teal')).toBe(true);
  });

  it('defaults to teal theme when nothing is saved', () => {
    expect(service.getSavedTheme()).toBe('teal');
  });

  it('applies the saved theme attribute on construction', () => {
    localStorage.setItem('vendora-theme', 'blue');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
    expect(document.documentElement.getAttribute('data-theme')).toBe('blue');
  });

  it('setTheme persists the theme and updates the document attribute', () => {
    service.setTheme('indigo');
    expect(service.getSavedTheme()).toBe('indigo');
    expect(localStorage.getItem('vendora-theme')).toBe('indigo');
    expect(document.documentElement.getAttribute('data-theme')).toBe('indigo');
  });

  it('setTheme falls back to teal for unknown theme ids', () => {
    service.setTheme('unknown');
    expect(service.getSavedTheme()).toBe('teal');
    expect(document.documentElement.getAttribute('data-theme')).toBe('teal');
  });
});
