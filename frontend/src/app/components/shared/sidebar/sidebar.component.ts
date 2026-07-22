import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { ThemePickerComponent } from '../theme-picker/theme-picker.component';
import { CurrencyPickerComponent } from '../currency-picker/currency-picker.component';
import { QuickAddComponent } from '../quick-add/quick-add.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, ThemePickerComponent, CurrencyPickerComponent, QuickAddComponent],
  template: `
    <app-quick-add></app-quick-add>

    <!-- Mobile hamburger button (fixed top-left) -->
    <button
      data-testid="sidebar-hamburger"
      (click)="mobileOpen = true"
      class="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-primary-600 text-white shadow-lg">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>

    <!-- Backdrop -->
    <div *ngIf="mobileOpen"
      data-testid="sidebar-backdrop"
      (click)="mobileOpen = false"
      class="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity">
    </div>

    <!-- Sidebar -->
    <aside
      class="fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 h-[100dvh] lg:h-screen bg-primary-500 text-white shadow-lg flex-shrink-0 flex flex-col transition-transform duration-300 lg:translate-x-0"
      [class.translate-x-0]="mobileOpen"
      [class.-translate-x-full]="!mobileOpen">

      <div class="p-6 flex items-center justify-between">
        <!-- Close button (mobile only) -->
        <button data-testid="sidebar-close" (click)="mobileOpen = false" class="lg:hidden absolute top-3 right-3 p-1 text-primary-200 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <a routerLink="/dashboard" (click)="mobileOpen = false" class="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h1 class="text-2xl font-bold">Vendora</h1>
        </a>
      </div>

      <nav class="mt-2 flex-1 overflow-y-auto">
        <a routerLink="/dashboard" (click)="mobileOpen = false"
          class="flex items-center px-6 py-3 text-white hover:bg-primary-600 transition-colors"
          [class.bg-primary-700]="isActive('/dashboard')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="font-semibold">Dashboard</span>
        </a>

        <a routerLink="/budgets" (click)="mobileOpen = false"
          class="flex items-center px-6 py-3 text-white hover:bg-primary-600 transition-colors"
          [class.bg-primary-700]="isActive('/budgets')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span class="font-semibold">Budget</span>
        </a>

        <a routerLink="/investments" (click)="mobileOpen = false"
          class="flex items-center px-6 py-3 text-white hover:bg-primary-600 transition-colors"
          [class.bg-primary-700]="isActive('/investments')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span class="font-semibold">Investments</span>
        </a>

        <a routerLink="/net-worth" (click)="mobileOpen = false"
          class="flex items-center px-6 py-3 text-white hover:bg-primary-600 transition-colors"
          [class.bg-primary-700]="isActive('/net-worth')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-semibold">Net Worth</span>
        </a>

        <a routerLink="/health-score" (click)="mobileOpen = false"
          class="flex items-center px-6 py-3 text-white hover:bg-primary-600 transition-colors"
          [class.bg-primary-700]="isActive('/health-score')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="font-semibold">Health Score</span>
        </a>

        <a *ngIf="canAccessAdmin" [href]="adminUrl" target="_self" (click)="mobileOpen = false"
          class="flex items-center px-6 py-3 text-white hover:bg-primary-600 transition-colors">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span class="font-semibold">Admin</span>
        </a>
      </nav>

      <div class="p-4 border-t border-primary-600 space-y-2">
        <app-theme-picker></app-theme-picker>
        <app-currency-picker></app-currency-picker>
      </div>

      <div class="p-4 border-t border-primary-600 space-y-1">
        <a routerLink="/account" (click)="mobileOpen = false"
          class="flex items-center px-3 py-2 text-white hover:bg-primary-600 rounded-md transition-colors"
          [class.bg-primary-700]="isActive('/account')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zM19 20a9 9 0 10-18 0" />
          </svg>
          <span class="font-semibold">Account</span>
        </a>
        <button (click)="logout()"
          class="w-full flex items-center px-3 py-2 text-red-200 hover:bg-primary-600 hover:text-white rounded-md transition-colors">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span class="font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  `
})
export class SidebarComponent implements OnInit {
  user: any = null;
  initials = '';
  mobileOpen = false;
  adminUrl = environment.backendUrl + '/admin';

  get canAccessAdmin(): boolean {
    return this.user?.roles?.some((role: string) => ['admin', 'manager'].includes(role)) ?? false;
  }

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.getUserObservable().subscribe(u => {
      this.user = u;
      const name: string = u?.name || '';
      this.initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
    });
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileOpen = false;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => { this.authService.clearAuth(); this.router.navigate(['/login']); },
      error: () => { this.authService.clearAuth(); this.router.navigate(['/login']); }
    });
  }
}
