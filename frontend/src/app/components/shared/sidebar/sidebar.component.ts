import {
  Component,
  OnInit,
  HostListener,
  DestroyRef,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, timer } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { environment } from '../../../../environments/environment';
import { ThemePickerComponent } from '../theme-picker/theme-picker.component';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguagePickerComponent } from '../language-picker/language-picker.component';
import { CurrencyPickerComponent } from '../currency-picker/currency-picker.component';
import { QuickAddComponent } from '../quick-add/quick-add.component';
import { User } from '../../../services/auth.service';
import { PwaService } from '../../../services/pwa.service';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ThemePickerComponent,
    CurrencyPickerComponent,
    LanguagePickerComponent,
    QuickAddComponent,
    TranslatePipe,
  ],
  template: `
    <app-quick-add></app-quick-add>

    <!-- Mobile hamburger button (fixed top-left) -->
    <button
      data-testid="sidebar-hamburger"
      (click)="mobileOpen = true"
      class="lg:hidden fixed top-3 left-3 z-50 p-3 rounded-lg bg-primary-600 text-white shadow-lg"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>

    <!-- Backdrop -->
    <div
      *ngIf="mobileOpen"
      data-testid="sidebar-backdrop"
      (click)="mobileOpen = false"
      class="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
    ></div>

    <!-- Sidebar -->
    <aside
      class="fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 w-64 h-[100dvh] lg:h-screen bg-white text-gray-600 border-r border-gray-200 flex-shrink-0 flex flex-col transition-transform duration-300 lg:translate-x-0"
      [class.translate-x-0]="mobileOpen"
      [class.-translate-x-full]="!mobileOpen"
    >
      <div class="p-6 flex items-center justify-between">
        <!-- Close button (mobile only) -->
        <button
          data-testid="sidebar-close"
          (click)="mobileOpen = false"
          class="lg:hidden absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-700"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <a
          routerLink="/dashboard"
          (click)="mobileOpen = false"
          class="flex items-center space-x-2 hover:opacity-80 transition-opacity"
        >
          <svg
            class="w-7 h-7 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">Vendora</h1>
        </a>
      </div>

      <nav class="mt-2 flex-1 overflow-y-auto">
        <a
          routerLink="/dashboard"
          (click)="mobileOpen = false"
          class="flex items-center mx-3 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          [class.bg-primary-50]="isActive('/dashboard')"
          [class.text-primary-700]="isActive('/dashboard')"
          [class.text-gray-600]="!isActive('/dashboard')"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span class="font-medium">{{ 'nav.dashboard' | translate }}</span>
        </a>

        <a
          routerLink="/transactions"
          (click)="mobileOpen = false"
          class="flex items-center mx-3 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          [class.bg-primary-50]="isActive('/transactions')"
          [class.text-primary-700]="isActive('/transactions')"
          [class.text-gray-600]="!isActive('/transactions')"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          <span class="font-medium">{{ 'nav.transactions' | translate }}</span>
        </a>

        <a
          routerLink="/investments"
          (click)="mobileOpen = false"
          class="flex items-center mx-3 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          [class.bg-primary-50]="isActive('/investments')"
          [class.text-primary-700]="isActive('/investments')"
          [class.text-gray-600]="!isActive('/investments')"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <span class="font-medium">{{ 'nav.investments' | translate }}</span>
        </a>

        <a
          routerLink="/net-worth"
          (click)="mobileOpen = false"
          class="flex items-center mx-3 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          [class.bg-primary-50]="isActive('/net-worth')"
          [class.text-primary-700]="isActive('/net-worth')"
          [class.text-gray-600]="!isActive('/net-worth')"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="font-medium">{{ 'nav.netWorth' | translate }}</span>
        </a>

        <a
          routerLink="/health-score"
          (click)="mobileOpen = false"
          class="flex items-center mx-3 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          [class.bg-primary-50]="isActive('/health-score')"
          [class.text-primary-700]="isActive('/health-score')"
          [class.text-gray-600]="!isActive('/health-score')"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span class="font-medium">{{ 'nav.healthScore' | translate }}</span>
        </a>

        <a
          routerLink="/ai-support"
          (click)="mobileOpen = false"
          class="flex items-center mx-3 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          [class.bg-primary-50]="isActive('/ai-support')"
          [class.text-primary-700]="isActive('/ai-support')"
          [class.text-gray-600]="!isActive('/ai-support')"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <span class="font-medium">{{ 'nav.aiSupport' | translate }}</span>
        </a>

        <a
          routerLink="/notifications"
          (click)="mobileOpen = false"
          class="flex items-center mx-3 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
          [class.bg-primary-50]="isActive('/notifications')"
          [class.text-primary-700]="isActive('/notifications')"
          [class.text-gray-600]="!isActive('/notifications')"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span class="font-medium">{{ 'nav.notifications' | translate }}</span>
          <span
            *ngIf="unreadCount > 0"
            data-testid="sidebar-unread-badge"
            class="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-bold bg-red-600 text-white rounded-full"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </a>

        <button
          *ngIf="canAccessAdmin"
          type="button"
          (click)="openAdmin()"
          class="w-[calc(100%-1.5rem)] flex items-center mx-3 my-0.5 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          [title]="'nav.openAdminPanel' | translate"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span class="font-medium">{{ 'nav.admin' | translate }}</span>
        </button>
      </nav>

      <div class="p-4 border-t border-gray-200 space-y-2">
        <app-theme-picker></app-theme-picker>
        <app-currency-picker></app-currency-picker>
        <app-language-picker></app-language-picker>
        <button
          *ngIf="pwa.updateReady()"
          data-testid="pwa-update"
          (click)="pwa.reload()"
          class="w-full px-3 py-2 text-sm rounded-xl bg-primary-600 text-white"
        >
          {{ 'nav.pwaUpdate' | translate }}
        </button>
        <button
          *ngIf="pwa.canInstall()"
          data-testid="pwa-install"
          (click)="pwa.install()"
          class="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 hover:bg-gray-50"
        >
          {{ 'nav.pwaInstall' | translate }}
        </button>
        <p *ngIf="pwa.showIosHint" data-testid="pwa-ios-hint" class="text-xs text-gray-500">
          {{ 'nav.pwaIosHint' | translate }}
        </p>
      </div>

      <div class="p-4 border-t border-gray-200 space-y-1">
        <a
          routerLink="/account"
          (click)="mobileOpen = false"
          class="flex items-center gap-3 px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
          [class.bg-primary-50]="isActive('/account')"
        >
          <span
            class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0"
            >{{ initials }}</span
          >
          <span class="min-w-0 leading-tight">
            <span class="block text-sm font-medium text-gray-900 truncate">{{ user?.name }}</span>
            <span class="block text-xs text-gray-400 truncate">{{ user?.email }}</span>
          </span>
        </a>
        <button
          (click)="logout()"
          class="w-full flex items-center px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span class="font-medium">{{ 'nav.logout' | translate }}</span>
        </button>
      </div>
    </aside>
  `,
})
export class SidebarComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  protected readonly pwa = inject(PwaService);

  user: User | null = null;
  initials = '';
  mobileOpen = false;
  unreadCount = 0;
  adminUrl = environment.backendUrl + '/admin';

  get canAccessAdmin(): boolean {
    return this.user?.roles?.some((role: string) => ['admin', 'manager'].includes(role)) ?? false;
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.notificationService.unreadCount$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => (this.unreadCount = c));
    // Poll so the badge follows notifications generated while the page stays open; failures are ignored.
    timer(0, 5 * 60 * 1000)
      .pipe(
        switchMap(() => this.notificationService.refreshCount().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.authService
      .getUserObservable()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((u) => {
        this.user = u;
        const name: string = u?.name || '';
        this.initials =
          name
            .split(' ')
            .map((w: string) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || '?';
      });
  }

  isActive(path: string): boolean {
    return this.router.url.split('?')[0] === path;
  }

  openAdmin(): void {
    this.mobileOpen = false;

    // Ask the backend for a single-use link so the panel opens already signed in.
    this.http.post<{ url: string }>(`${environment.apiUrl}/admin/panel-link`, {}).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: () => window.location.assign(this.adminUrl),
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.mobileOpen = false;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.authService.clearAuth();
        this.router.navigate(['/login']);
      },
    });
  }
}
