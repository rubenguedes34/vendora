import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

interface Transaction {
  id: number;
  user_id: number;
  category_id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  category?: {
    id: number;
    name: string;
    icon?: string;
    color?: string;
    type: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getTokenValue()}`
    });
  }

  private handleError(error: any): any {
    if (error.status === 401) return { message: 'Session expired. Please log in again.' };
    return error.error || { message: 'An error occurred. Please try again.' };
  }

  getTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  getTransaction(id: number): Observable<Transaction> {
    return this.http.get<Transaction>(`${this.apiUrl}/transactions/${id}`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  createTransaction(data: any): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, data, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  updateTransaction(id: number, data: any): Observable<Transaction> {
    return this.http.put<Transaction>(`${this.apiUrl}/transactions/${id}`, data, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  deleteTransaction(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transactions/${id}`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }
}
