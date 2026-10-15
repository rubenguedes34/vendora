import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeOption, ThemeMode } from '../../../services/theme.service';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <!-- Collapsed row -->
      <button
        type="button"
        (click)="open = !open"
        [attr.aria-expanded]="open"
        class="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-gray-100 transition-colors group"
      >
        <div class="flex items-center gap-2.5">
          <svg class="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            />
          </svg>
          <span class="text-sm font-semibold">Theme</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-500">{{ activeLabel }}</span>
          <div
            class="w-4 h-4 rounded-full border border-gray-200 shadow-sm flex-shrink-0"
            [style.background-color]="activeColor"
          ></div>
          <svg
            class="w-3.5 h-3.5 opacity-60 transition-transform"
            [class.rotate-180]="open"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      <!-- Expanded swatches -->
      <div *ngIf="open" class="mt-3 px-1">
        <div class="grid grid-cols-3 gap-2">
          <button
            *ngFor="let theme of themes"
            type="button"
            (click)="selectTheme(theme.id)"
            [title]="theme.label"
            [attr.aria-label]="theme.label"
            [attr.aria-pressed]="activeTheme === theme.id"
            class="flex flex-col items-center gap-1 group/swatch focus:outline-none"
          >
            <div
              class="w-8 h-8 rounded-full border-2 shadow-sm transition-all hover:scale-110"
              [class.border-white]="activeTheme === theme.id"
              [class.border-transparent]="activeTheme !== theme.id"
              [class.scale-110]="activeTheme === theme.id"
              [class.ring-2]="activeTheme === theme.id"
              [class.ring-white]="activeTheme === theme.id"
              [class.ring-offset-1]="activeTheme === theme.id"
              [style.background-color]="theme.baseColor"
            >
              <svg
                *ngIf="activeTheme === theme.id"
                class="w-full h-full p-1.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span
              class="text-xs text-gray-500 leading-none"
              >{{ theme.label }}</span
            >
          </button>
        </div>
      </div>

      <!-- Light / dark / system -->
      <div
        class="flex p-0.5 mt-2 mb-2 rounded-lg bg-gray-100 text-xs font-medium"
        role="group"
        aria-label="Colour mode"
      >
        <button
          *ngFor="let m of modes"
          type="button"
          (click)="selectMode(m.id)"
          class="flex-1 py-1 rounded-md transition-colors"
          [class.bg-white]="activeMode === m.id"
          [class.shadow-sm]="activeMode === m.id"
          [class.text-gray-900]="activeMode === m.id"
          [class.text-gray-500]="activeMode !== m.id"
          [attr.aria-pressed]="activeMode === m.id"
        >
          {{ m.label }}
        </button>
      </div>
    </div>
  `,
})
export class ThemePickerComponent implements OnInit {
  themes: ThemeOption[] = [];
  readonly modes: { id: ThemeMode; label: string }[] = [
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
    { id: 'system', label: 'System' },
  ];
  activeMode: ThemeMode = 'light';
  activeTheme = '';
  open = false;

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themes = this.themeService.themes;
    this.activeTheme = this.themeService.getSavedTheme();
    this.activeMode = this.themeService.getSavedMode();
  }

  selectMode(mode: ThemeMode): void {
    this.themeService.setMode(mode);
    this.activeMode = mode;
  }

  get activeLabel(): string {
    return this.themes.find((t) => t.id === this.activeTheme)?.label ?? '';
  }

  get activeColor(): string {
    return this.themes.find((t) => t.id === this.activeTheme)?.baseColor ?? '';
  }

  selectTheme(id: string): void {
    this.themeService.setTheme(id);
    this.activeTheme = id;
    this.open = false;
  }
}
