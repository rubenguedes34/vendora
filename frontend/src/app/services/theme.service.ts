import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeOption {
  id: string;
  label: string;
  baseColor: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly storageKey = 'vendora-theme';
  private readonly modeKey = 'vendora-mode';

  readonly themes: ThemeOption[] = [
    { id: 'teal', label: 'Teal', baseColor: '#14b8a6' },
    { id: 'indigo', label: 'Indigo', baseColor: '#6366f1' },
    { id: 'rose', label: 'Rose', baseColor: '#f43f5e' },
  ];

  /** True while the dark palette is active; charts subscribe to redraw with matching colours. */
  readonly dark$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.applyTheme(this.getSavedTheme());
    this.applyMode(this.getSavedMode());
    // 'system' follows the OS live; the saved choice is re-read so other modes are untouched.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', () => this.applyMode(this.getSavedMode()));
    }
  }

  getSavedMode(): ThemeMode {
    if (typeof window === 'undefined') {
      return 'light';
    }
    const saved = localStorage.getItem(this.modeKey);
    return saved === 'dark' || saved === 'system' ? saved : 'light';
  }

  setMode(mode: ThemeMode): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.modeKey, mode);
    }
    this.applyMode(mode);
  }

  private applyMode(mode: ThemeMode): void {
    if (typeof document === 'undefined') {
      return;
    }
    const prefersDark =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = mode === 'dark' || (mode === 'system' && prefersDark);
    document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
    this.dark$.next(dark);
    // Charts created after this point pick up readable default text colours.
    const chart = (window as unknown as { Chart?: { defaults: { color: string } } }).Chart;
    if (chart) chart.defaults.color = dark ? '#8b97b3' : '#666';
  }

  getSavedTheme(): string {
    if (typeof window === 'undefined') {
      return this.themes[0].id;
    }
    // A palette removed in a later release falls back to the default instead of leaving the picker blank.
    const saved = localStorage.getItem(this.storageKey);
    return this.themes.some((t) => t.id === saved) ? (saved as string) : this.themes[0].id;
  }

  setTheme(id: string): void {
    const theme = this.themes.find((t) => t.id === id) || this.themes[0];
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.storageKey, theme.id);
    }
    this.applyTheme(theme.id);
  }

  private applyTheme(id: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute('data-theme', id);
  }
}
