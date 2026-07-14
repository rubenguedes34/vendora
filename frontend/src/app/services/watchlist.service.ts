import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface WatchlistItem {
  id: number;
  symbol: string;
  name: string | null;
  type: string | null;
  exchange: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private apiUrl = environment.apiUrl;
  private _items = new BehaviorSubject<WatchlistItem[]>([]);
  items$ = this._items.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getTokenValue()}`
    });
  }

  load(): Observable<WatchlistItem[]> {
    return this.http.get<WatchlistItem[]>(`${this.apiUrl}/watchlist`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      tap(items => this._items.next(items)),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  add(item: Omit<WatchlistItem, 'id'>): Observable<WatchlistItem> {
    return this.http.post<WatchlistItem>(`${this.apiUrl}/watchlist`, item, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      tap(newItem => this._items.next([newItem, ...this._items.value.filter(i => i.symbol !== newItem.symbol)])),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/watchlist/${id}`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      tap(() => this._items.next(this._items.value.filter(i => i.id !== id))),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  private handleError(error: any): Error {
    if (error.status === 0) return new Error('Network error');
    if (error.status === 422) return new Error(error.error?.message || 'Invalid input');
    return new Error(error.error?.message || 'Watchlist request failed');
  }
}
