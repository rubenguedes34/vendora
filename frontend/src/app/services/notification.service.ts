import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ApiError } from '../models/api';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private apiUrl = environment.apiUrl;
  private _notifications = new BehaviorSubject<AppNotification[]>([]);
  notifications$ = this._notifications.asObservable();

  private _unreadCount = new BehaviorSubject<number>(0);
  unreadCount$ = this._unreadCount.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    // The service is a root singleton: drop the previous user's data when they log out.
    this.authService.loggedOut$.subscribe(() => {
      this._notifications.next([]);
      this._unreadCount.next(0);
    });
  }

  load(unreadOnly = false): Observable<AppNotification[]> {
    const qs = unreadOnly ? '?unread_only=1' : '';
    return this.http.get<AppNotification[]>(`${this.apiUrl}/notifications${qs}`).pipe(
      timeout(8000),
      tap((items) => this._notifications.next(items)),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }

  refreshCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/notifications/unread-count`).pipe(
      timeout(5000),
      tap((c) => this._unreadCount.next(c.count)),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }

  markAsRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.apiUrl}/notifications/${id}/read`, {}).pipe(
      timeout(5000),
      tap((n) => this.updateLocalNotification(n)),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }

  markAllAsRead(): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/notifications/read-all`, {}).pipe(
      timeout(5000),
      tap(() => {
        const updated = this._notifications.value.map((n) => ({
          ...n,
          is_read: true,
          read_at: new Date().toISOString(),
        }));
        this._notifications.next(updated);
        this._unreadCount.next(0);
      }),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/notifications/${id}`).pipe(
      timeout(5000),
      tap(() => {
        const remaining = this._notifications.value.filter((n) => n.id !== id);
        this._notifications.next(remaining);
        this.refreshCount().subscribe();
      }),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }

  private updateLocalNotification(updated: AppNotification): void {
    const list = this._notifications.value.map((n) => (n.id === updated.id ? updated : n));
    this._notifications.next(list);
    this.refreshCount().subscribe();
  }

  private handleError(error: ApiError): Error {
    if (error.status === 0) return new Error('Network error');
    return new Error(error.error?.message || 'Notification request failed');
  }
}
