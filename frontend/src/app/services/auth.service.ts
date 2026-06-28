import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface User {
  id: number;
  name: string;
  email: string;
  monthly_income?: number;
  monthly_expenses?: number;
  current_year?: number;
  current_month?: number;
  needs_setup?: boolean;
}

interface AuthResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private userSubject = new BehaviorSubject<User | null>(null);

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

  register(data: { name: string; email: string; password: string; password_confirmation: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      timeout(10000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  login(data: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      timeout(3000),
      catchError(error => {
        // Handle 401 errors specifically
        if (error.status === 401) {
          return throwError(() => ({ message: 'Invalid email or password. Please try again.' }));
        }
        return throwError(() => this.handleError(error));
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      timeout(10000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  getUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/user`).pipe(
      timeout(10000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  private handleError(error: any): any {
    if (error.name === 'TimeoutError') {
      return { message: 'Request timeout. Please check your connection and try again.' };
    }
    if (error.status === 0) {
      return { message: 'Unable to connect to server. Please check if the backend is running.' };
    }
    if (error.status === 401) {
      return { message: 'Invalid email or password. Please try again.' };
    }
    return error.error || { message: 'An error occurred. Please try again.' };
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
    this.tokenSubject.next(token);
  }

  setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.userSubject.next(user);
  }

  clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
    this.userSubject.next(null);
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

  getUserValue(): User | null {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    return !!this.tokenSubject.value;
  }
}
