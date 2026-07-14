import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private apiUrl = environment.apiUrl;
  private _tags$ = new BehaviorSubject<Tag[]>([]);
  readonly tags$ = this._tags$.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getTokenValue()}`
    });
  }

  private handleError(error: any): any {
    return error.error || { message: 'An error occurred. Please try again.' };
  }

  loadTags(): void {
    this.http.get<Tag[]>(`${this.apiUrl}/tags`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    ).subscribe({ next: (tags) => this._tags$.next(tags), error: () => {} });
  }

  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      tap(tags => this._tags$.next(tags)),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  createTag(data: { name: string; color?: string }): Observable<Tag> {
    return this.http.post<Tag>(`${this.apiUrl}/tags`, data, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      tap(tag => this._tags$.next([...this._tags$.value, tag])),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  updateTag(id: number, data: Partial<{ name: string; color: string }>): Observable<Tag> {
    return this.http.put<Tag>(`${this.apiUrl}/tags/${id}`, data, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      tap(updated => {
        this._tags$.next(this._tags$.value.map(t => t.id === updated.id ? updated : t));
      }),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  deleteTag(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tags/${id}`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      tap(() => this._tags$.next(this._tags$.value.filter(t => t.id !== id))),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }
}
