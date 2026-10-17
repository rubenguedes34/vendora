import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ApiError, ApiErrorMessage, MessageResponse } from '../models/api';

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
}

@Injectable({
  providedIn: 'root',
})
export class TagService {
  private apiUrl = environment.apiUrl;
  private _tags$ = new BehaviorSubject<Tag[]>([]);
  readonly tags$ = this._tags$.asObservable();

  private translate = inject(TranslateService);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  private handleError(error: ApiError): ApiErrorMessage {
    return error.error || { message: this.translate.instant('errors.generic') };
  }

  loadTags(): void {
    this.http
      .get<Tag[]>(`${this.apiUrl}/tags`)
      .pipe(
        timeout(5000),
        catchError((err) => throwError(() => this.handleError(err))),
      )
      .subscribe({ next: (tags) => this._tags$.next(tags), error: () => {} });
  }

  getTags(): Observable<Tag[]> {
    return this.http.get<Tag[]>(`${this.apiUrl}/tags`).pipe(
      timeout(5000),
      tap((tags) => this._tags$.next(tags)),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }

  createTag(data: { name: string; color?: string }): Observable<Tag> {
    return this.http.post<Tag>(`${this.apiUrl}/tags`, data).pipe(
      timeout(5000),
      tap((tag) => this._tags$.next([...this._tags$.value, tag])),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }

  updateTag(id: number, data: Partial<{ name: string; color: string }>): Observable<Tag> {
    return this.http.put<Tag>(`${this.apiUrl}/tags/${id}`, data).pipe(
      timeout(5000),
      tap((updated) => {
        this._tags$.next(this._tags$.value.map((t) => (t.id === updated.id ? updated : t)));
      }),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }

  deleteTag(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.apiUrl}/tags/${id}`).pipe(
      timeout(5000),
      tap(() => this._tags$.next(this._tags$.value.filter((t) => t.id !== id))),
      catchError((err) => throwError(() => this.handleError(err))),
    );
  }
}
