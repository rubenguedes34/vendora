import { Component, OnInit, DestroyRef, ChangeDetectorRef, inject, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { SidebarComponent } from '../shared/sidebar/sidebar.component';
import { AlertRulesComponent } from './alert-rules.component';
import { CurrencyTextPipe } from '../../pipes/currency-text.pipe';

const ICONS: Record<string, string> = {
  'budget_exceeded': '🚨',
  'budget_almost_exceeded': '⚠️',
  'recurring_due': '🔄',
  'monthly_report_ready': '📊',
  'savings_goal_completed': '🎯',
  'investment_reached_target': '📈',
  'alert_rule_triggered': '🚧',
};

const COLORS: Record<string, string> = {
  'budget_exceeded': 'bg-red-100 text-red-700',
  'budget_almost_exceeded': 'bg-yellow-100 text-yellow-700',
  'recurring_due': 'bg-blue-100 text-blue-700',
  'monthly_report_ready': 'bg-purple-100 text-purple-700',
  'savings_goal_completed': 'bg-green-100 text-green-700',
  'investment_reached_target': 'bg-emerald-100 text-emerald-700',
  'alert_rule_triggered': 'bg-orange-100 text-orange-700',
};

@Component({
  selector: 'app-notifications',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [CommonModule, SidebarComponent, AlertRulesComponent, CurrencyTextPipe],
  template: `
    <div class="min-h-screen bg-slate-50 flex">
      <app-sidebar></app-sidebar>

      <main class="flex-1 overflow-auto pt-14 lg:pt-0 pb-20 lg:pb-0">
        <header class="page-header">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
              <div>
                <h2 class="text-xl font-semibold">Notification History</h2>
                <p class="text-primary-200 text-xs">View and manage all notifications</p>
              </div>
              <button *ngIf="unreadCount > 0" (click)="markAllRead()" [disabled]="markingAll"
                class="text-xs bg-primary-600 hover:bg-primary-800 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                Mark all as read
              </button>
            </div>
          </div>
        </header>

        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <app-alert-rules></app-alert-rules>

          <div *ngIf="errorMessage" class="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{{ errorMessage }}</div>

          <div *ngIf="loading" class="text-center py-12 text-gray-400">Loading…</div>

          <div *ngIf="!loading && notifications.length === 0" class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <svg class="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <p class="text-gray-500">No notifications yet.</p>
          </div>

          <div *ngIf="!loading" class="space-y-2">
            <div *ngFor="let n of notifications"
              class="flex gap-3 p-4 bg-white rounded-2xl border border-gray-200 hover:bg-gray-50 transition-colors"
              [class.bg-blue-50/30]="!n.is_read">
              <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base"
                [class]="colorFor(n.type)">
                {{ iconFor(n.type) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-medium text-gray-800">{{ n.title }}</p>
                    <p class="text-sm text-gray-500">{{ n.body | currencyText }}</p>
                  </div>
                  <span class="text-xs text-gray-400 whitespace-nowrap">{{ n.created_at | date:'medium' }}</span>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2">
                <span *ngIf="!n.is_read" class="w-2 h-2 rounded-full bg-primary-500"></span>
                <button *ngIf="n.is_read" (click)="delete(n.id)" [disabled]="deleting === n.id"
                  class="text-gray-300 hover:text-red-500 p-1">
                  <svg *ngIf="deleting !== n.id" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                  <div *ngIf="deleting === n.id" class="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin"></div>
                </button>
                <button *ngIf="!n.is_read" (click)="markRead(n.id)" [disabled]="marking === n.id"
                  class="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-md hover:bg-primary-100 transition-colors">
                  {{ marking === n.id ? '…' : 'Mark read' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class NotificationsComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  notifications: AppNotification[] = [];
  unreadCount = 0;
  loading = false;
  errorMessage = '';
  marking: number | null = null;
  markingAll = false;
  deleting: number | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.notificationService.notifications$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(n => { this.notifications = n; this.cdr.markForCheck(); });
    this.notificationService.unreadCount$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(c => { this.unreadCount = c; this.cdr.markForCheck(); });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.notificationService.load().subscribe({
      next: () => { this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.errorMessage = 'Could not load notifications.'; this.cdr.markForCheck(); }
    });
  }

  markRead(id: number): void {
    this.marking = id;
    this.errorMessage = '';
    this.notificationService.markAsRead(id).subscribe({
      complete: () => { this.marking = null; this.cdr.markForCheck(); },
      error: () => { this.marking = null; this.errorMessage = 'Could not mark the notification as read.'; this.cdr.markForCheck(); }
    });
  }

  markAllRead(): void {
    this.markingAll = true;
    this.errorMessage = '';
    this.notificationService.markAllAsRead().subscribe({
      complete: () => { this.markingAll = false; this.cdr.markForCheck(); },
      error: () => { this.markingAll = false; this.errorMessage = 'Could not mark all notifications as read.'; this.cdr.markForCheck(); }
    });
  }

  delete(id: number): void {
    this.deleting = id;
    this.errorMessage = '';
    this.notificationService.delete(id).subscribe({
      complete: () => { this.deleting = null; this.cdr.markForCheck(); },
      error: () => { this.deleting = null; this.errorMessage = 'Could not delete the notification.'; this.cdr.markForCheck(); }
    });
  }

  iconFor(type: string): string {
    return ICONS[type] ?? '🔔';
  }

  colorFor(type: string): string {
    return COLORS[type] ?? 'bg-gray-100 text-gray-600';
  }
}
