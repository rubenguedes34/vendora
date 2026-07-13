import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeOption } from '../../../services/theme.service';

@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      <p class="text-xs font-semibold uppercase tracking-wide mb-2 opacity-90">Theme</p>
      <div class="flex flex-wrap gap-2">
        <button
          *ngFor="let theme of themes"
          type="button"
          (click)="selectTheme(theme.id)"
          [title]="theme.label"
          [attr.aria-label]="'Select ' + theme.label + ' theme'"
          class="w-7 h-7 rounded-full border border-gray-300/70 shadow-sm transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
          [class.ring-2]="activeTheme === theme.id"
          [class.ring-offset-2]="activeTheme === theme.id"
          [class.ring-gray-700]="activeTheme === theme.id"
          [style.background-color]="theme.baseColor">
        </button>
      </div>
    </div>
  `,
})
export class ThemePickerComponent implements OnInit {
  themes: ThemeOption[] = [];
  activeTheme = '';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themes = this.themeService.themes;
    this.activeTheme = this.themeService.getSavedTheme();
  }

  selectTheme(id: string): void {
    this.themeService.setTheme(id);
    this.activeTheme = id;
  }
}
