import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService, AppNotification } from '../../../services/notification.service';

const ICONS: Record<string, string> = {
  'budget_exceeded': '🚨',
  'budget_almost_exceeded': '⚠️',
  'recurring_due': '🔄',
  'monthly_report_ready': '📊',
  'savings_goal_completed': '🎯',
  'investment_reached_target': '📈',
};

const COLORS: Record<string, string> = {
  'budget_exceeded': 'bg-red-100 text-red-700',
  'budget_almost_exceeded': 'bg-yellow-100 text-yellow-700',
  'recurring_due': 'bg-blue-100 text-blue-700',
  'monthly_report_ready': 'bg-purple-100 text-purple-700',
  'savings_goal_completed': 'bg-green-100 text-green-700',
  'investment_reached_target': 'bg-emerald-100 text-emerald-700',
};

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" #container>
      <button (click)="toggle($event)" class="relative p-2 rounded-full hover:bg-primary-600 transition-colors">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span *ngIf="unreadCount > 0"
          class="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </button>

      <div *ngIf="open"
        class="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 class="text-sm font-semibold text-gray-700">Notifications</h3>
          <div class="flex items-center gap-2">
            <button *ngIf="unreadCount > 0" (click)="markAllRead($event)" class="text-xs text-primary-600 hover:text-primary-800 font-medium">Mark all read</button>
            <button (click)="goToHistory($event)" class="text-xs text-gray-500 hover:text-gray-700">History</button>
          </div>
        </div>

        <div class="max-h-80 overflow-y-auto">
          <div *ngIf="loading" class="p-8 text-center text-gray-400 text-sm">Loading…</div>

          <div *ngIf="!loading && notifications.length === 0" class="p-8 text-center text-gray-400 text-sm">
            <svg class="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            No notifications
          </div>

          <div *ngFor="let n of notifications" (click)="markRead(n, $event)"
            class="flex gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
            [class.bg-blue-50/40]="!n.is_read">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
              [class]="colorFor(n.type)">
              {{ iconFor(n.type) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-800">{{ n.title }}</p>
              <p class="text-xs text-gray-500 truncate">{{ n.body || '' }}</p>
              <p class="text-[10px] text-gray-400 mt-1">{{ n.created_at | date:'short' }}</p>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span *ngIf="!n.is_read" class="w-2 h-2 rounded-full bg-primary-500"></span>
              <button (click)="remove(n.id, $event)" class="text-gray-300 hover:text-red-500 p-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  open = false;
  loading = false;
  notifications: AppNotification[] = [];
  unreadCount = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private el: ElementRef,
  ) {}

  ngOnInit(): void {
    this.notificationService.notifications$.pipe(takeUntil(this.destroy$)).subscribe(n => this.notifications = n);
    this.notificationService.unreadCount$.pipe(takeUntil(this.destroy$)).subscribe(c => this.unreadCount = c);
    this.notificationService.refreshCount().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.open = !this.open;
    if (this.open) {
      this.loading = true;
      this.notificationService.load(true).subscribe({
        next: () => { this.loading = false; },
        error: () => { this.loading = false; }
      });
    }
  }

  markRead(n: AppNotification, event: Event): void {
    event.stopPropagation();
    if (n.is_read) return;
    this.notificationService.markAsRead(n.id).subscribe();
  }

  markAllRead(event: Event): void {
    event.stopPropagation();
    this.notificationService.markAllAsRead().subscribe();
  }

  remove(id: number, event: Event): void {
    event.stopPropagation();
    this.notificationService.delete(id).subscribe();
  }

  goToHistory(event: Event): void {
    event.stopPropagation();
    this.open = false;
    this.router.navigate(['/notifications']);
  }

  iconFor(type: string): string {
    return ICONS[type] ?? '🔔';
  }

  colorFor(type: string): string {
    return COLORS[type] ?? 'bg-gray-100 text-gray-600';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }
}
