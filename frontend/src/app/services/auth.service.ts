import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, throwError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from './language.service';
import { ApiError, ApiErrorMessage, MessageResponse } from '../models/api';

export interface User {
  id: number;
  name: string;
  email: string;
  roles?: string[];
  blacklisted_at?: string | null;
  monthly_income?: number;
  monthly_expenses?: number;
  savings_goal?: number;
  savings_goal_type?: 'percentage' | 'fixed';
  savings?: number;
  current_year?: number;
  current_month?: number;
  needs_setup?: boolean;
  locale?: 'en' | 'pt';
}

interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private userSubject = new BehaviorSubject<User | null>(null);
  readonly loggedOut$ = new Subject<void>();

  private language = inject(LanguageService);
  private translate = inject(TranslateService);

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token) {
      this.tokenSubject.next(token);
    }
    if (user) {
      this.userSubject.next(user);
    }
  }

  register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      timeout(10000),
      catchError((error) => throwError(() => this.handleError(error))),
    );
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      timeout(10000),
      catchError((error) => {
        // Handle 401 errors specifically
        if (error.status === 401) {
          return throwError(() => ({
            message: this.translate.instant('errors.invalidCredentials'),
          }));
        }
        return throwError(() => this.handleError(error));
      }),
    );
  }

  exchangeGoogleCode(code: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/google/exchange`, { code }).pipe(
      timeout(10000),
      catchError((error) => throwError(() => this.handleError(error))),
    );
  }

  logout(): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/logout`, {}).pipe(
      timeout(10000),
      catchError((error) => throwError(() => this.handleError(error))),
    );
  }

  getUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/user`).pipe(
      timeout(10000),
      catchError((error) => throwError(() => this.handleError(error))),
    );
  }

  private handleError(error: ApiError): ApiErrorMessage {
    if (error.name === 'TimeoutError') {
      return { message: this.translate.instant('errors.timeout') };
    }
    if (error.status === 0) {
      return { message: this.translate.instant('errors.connection') };
    }
    if (error.status === 401) {
      return { message: this.translate.instant('errors.invalidCredentials') };
    }
    return error.error || { message: this.translate.instant('errors.generic') };
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
    this.tokenSubject.next(token);
  }

  setUser(user: User): void {
    const isLogin = !this.userSubject.value;
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
    if (isLogin) this.language.syncWithUser(user.locale);
  }

  clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
    this.userSubject.next(null);
    this.loggedOut$.next();
  }

  getToken(): Observable<string | null> {
    return this.tokenSubject.asObservable();
  }

  getTokenValue(): string | null {
    return this.tokenSubject.value;
  }

  getUserObservable(): Observable<User | null> {
    return this.userSubject.asObservable();
  }

  isLoggedIn(): boolean {
    return !!this.tokenSubject.value;
  }

  getUserValue(): User | null {
    return this.userSubject.value;
  }
}
