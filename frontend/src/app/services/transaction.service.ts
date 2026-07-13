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

  getTransactions(filters?: { search?: string; type?: string; category_id?: number; date_from?: string; date_to?: string }): Observable<Transaction[]> {
    let params = '';
    if (filters) {
      const parts: string[] = [];
      if (filters.search)      parts.push(`search=${encodeURIComponent(filters.search)}`);
      if (filters.type)        parts.push(`type=${filters.type}`);
      if (filters.category_id) parts.push(`category_id=${filters.category_id}`);
      if (filters.date_from)   parts.push(`date_from=${filters.date_from}`);
      if (filters.date_to)     parts.push(`date_to=${filters.date_to}`);
      if (parts.length) params = '?' + parts.join('&');
    }
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions${params}`, { headers: this.getHeaders() }).pipe(
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

  exportTransactions(filters?: { search?: string; type?: string; category_id?: number; date_from?: string; date_to?: string }): void {
    const parts: string[] = [];
    if (filters?.search)      parts.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters?.type)        parts.push(`type=${filters.type}`);
    if (filters?.category_id) parts.push(`category_id=${filters.category_id}`);
    if (filters?.date_from)   parts.push(`date_from=${filters.date_from}`);
    if (filters?.date_to)     parts.push(`date_to=${filters.date_to}`);

    const qs = parts.length ? '?' + parts.join('&') : '';
    const url = `${this.apiUrl}/transactions/export${qs}`;
    const token = this.authService.getTokenValue();

    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  }
}
