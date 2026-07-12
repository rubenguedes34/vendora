import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <aside class="w-64 bg-teal-500 text-white shadow-lg flex-shrink-0 flex flex-col min-h-screen">
      <div class="p-6">
        <a routerLink="/dashboard" class="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <h1 class="text-2xl font-bold">Vendora</h1>
        </a>
        <p class="text-teal-100 text-sm mt-1">{{ user?.name }}</p>
      </div>

      <nav class="mt-2 flex-1">
        <a routerLink="/dashboard"
          class="flex items-center px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          [class.bg-teal-700]="isActive('/dashboard')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span class="font-semibold">Dashboard</span>
        </a>

        <a routerLink="/budgets"
          class="flex items-center px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          [class.bg-teal-700]="isActive('/budgets')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span class="font-semibold">Budgets</span>
        </a>

        <a routerLink="/transactions"
          class="flex items-center px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          [class.bg-teal-700]="isActive('/transactions')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span class="font-semibold">Transactions</span>
        </a>

        <a routerLink="/recurrent-transactions"
          class="flex items-center px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          [class.bg-teal-700]="isActive('/recurrent-transactions')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span class="font-semibold">Recurrent</span>
        </a>

        <a routerLink="/investments"
          class="flex items-center px-6 py-3 text-white hover:bg-teal-600 transition-colors"
          [class.bg-teal-700]="isActive('/investments')">
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span class="font-semibold">Investments</span>
        </a>
      </nav>

      <div class="p-4 border-t border-teal-600">
        <button (click)="logout()"
          class="w-full flex items-center px-3 py-2 text-red-200 hover:bg-teal-600 hover:text-white rounded-md transition-colors">
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

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.getUserObservable().subscribe(u => this.user = u);
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => { this.authService.clearAuth(); this.router.navigate(['/login']); },
      error: () => { this.authService.clearAuth(); this.router.navigate(['/login']); }
    });
  }
}
