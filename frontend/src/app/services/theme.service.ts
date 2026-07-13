import { Injectable } from '@angular/core';

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

  readonly themes: ThemeOption[] = [
    { id: 'teal', label: 'Teal', baseColor: '#14b8a6' },
    { id: 'blue', label: 'Blue', baseColor: '#3b82f6' },
    { id: 'indigo', label: 'Indigo', baseColor: '#6366f1' },
    { id: 'violet', label: 'Violet', baseColor: '#8b5cf6' },
    { id: 'rose', label: 'Rose', baseColor: '#f43f5e' },
    { id: 'emerald', label: 'Emerald', baseColor: '#10b981' },
    { id: 'amber', label: 'Amber', baseColor: '#f59e0b' },
    { id: 'slate', label: 'Slate', baseColor: '#64748b' },
  ];

  constructor() {
    this.applyTheme(this.getSavedTheme());
  }

  getSavedTheme(): string {
    if (typeof window === 'undefined') {
      return this.themes[0].id;
    }
    return localStorage.getItem(this.storageKey) || this.themes[0].id;
  }

  setTheme(id: string): void {
    const theme = this.themes.find(t => t.id === id) || this.themes[0];
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
