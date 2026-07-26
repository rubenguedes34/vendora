import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Transaction {
  id: number;
  user_id: number;
  category_id: number;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  transaction_date: string;
  notes?: string | null;
  attachment_path?: string | null;
  tags?: { id: number; name: string; color: string }[];
  category?: {
    id: number;
    name: string;
    icon?: string;
    color?: string;
    type: string;
  };
}

export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
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
    if (error.name === 'TimeoutError' || error.status === 0) {
      return { message: 'Could not reach the backend. Make sure php artisan serve is running.' };
    }
    return error.error || { message: 'An error occurred. Please try again.' };
  }

  getTransactions(filters?: {
    search?: string;
    notes_search?: string;
    type?: string;
    category_id?: number;
    date_from?: string;
    date_to?: string;
    amount_min?: number;
    amount_max?: number;
    tag_ids?: number[];
    page?: number;
    per_page?: number;
  }): Observable<PaginatedResponse<Transaction>> {
    let params = '';
    if (filters) {
      const parts: string[] = [];
      if (filters.search)                           parts.push(`search=${encodeURIComponent(filters.search)}`);
      if (filters.notes_search)                     parts.push(`notes_search=${encodeURIComponent(filters.notes_search)}`);
      if (filters.type)                             parts.push(`type=${filters.type}`);
      if (filters.category_id)                    parts.push(`category_id=${filters.category_id}`);
      if (filters.date_from)                        parts.push(`date_from=${filters.date_from}`);
      if (filters.date_to)                          parts.push(`date_to=${filters.date_to}`);
      if (filters.amount_min != null)               parts.push(`amount_min=${filters.amount_min}`);
      if (filters.amount_max != null)               parts.push(`amount_max=${filters.amount_max}`);
      if (filters.tag_ids) {
        const tagIds = Array.isArray(filters.tag_ids) ? filters.tag_ids : String(filters.tag_ids).split(',').map(s => s.trim());
        if (tagIds.length) parts.push(`tag_ids=${tagIds.join(',')}`);
      }
      if (filters.page)                             parts.push(`page=${filters.page}`);
      if (filters.per_page)                         parts.push(`per_page=${filters.per_page}`);
      if (parts.length) params = '?' + parts.join('&');
    }
    return this.http.get<PaginatedResponse<Transaction>>(`${this.apiUrl}/transactions${params}`, { headers: this.getHeaders() }).pipe(
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

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Authorization': `Bearer ${this.authService.getTokenValue()}` });
  }

  createTransaction(data: any): Observable<Transaction> {
    if (data instanceof FormData) {
      return this.http.post<Transaction>(`${this.apiUrl}/transactions`, data, { headers: this.authHeaders() }).pipe(
        timeout(10000),
        catchError(err => throwError(() => this.handleError(err)))
      );
    }
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, data, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  updateTransaction(id: number, data: any): Observable<Transaction> {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return this.http.post<Transaction>(`${this.apiUrl}/transactions/${id}`, data, { headers: this.authHeaders() }).pipe(
        timeout(10000),
        catchError(err => throwError(() => this.handleError(err)))
      );
    }
    return this.http.put<Transaction>(`${this.apiUrl}/transactions/${id}`, data, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  deleteAttachment(transactionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transactions/${transactionId}/attachment`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  getAttachment(transactionId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/transactions/${transactionId}/attachment`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }).pipe(
      timeout(8000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  deleteTransaction(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/transactions/${id}`, { headers: this.getHeaders() }).pipe(
      timeout(5000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  exportTransactions(filters?: {
    search?: string;
    notes_search?: string;
    type?: string;
    category_id?: number;
    date_from?: string;
    date_to?: string;
    amount_min?: number;
    amount_max?: number;
    tag_ids?: number[];
  }): void {
    const parts: string[] = [];
    if (filters?.search)                           parts.push(`search=${encodeURIComponent(filters.search)}`);
    if (filters?.notes_search)                     parts.push(`notes_search=${encodeURIComponent(filters.notes_search)}`);
    if (filters?.type)                             parts.push(`type=${filters.type}`);
    if (filters?.category_id)                      parts.push(`category_id=${filters.category_id}`);
    if (filters?.date_from)                        parts.push(`date_from=${filters.date_from}`);
    if (filters?.date_to)                          parts.push(`date_to=${filters.date_to}`);
    if (filters?.amount_min != null)               parts.push(`amount_min=${filters.amount_min}`);
    if (filters?.amount_max != null)               parts.push(`amount_max=${filters.amount_max}`);
    if (filters?.tag_ids && filters.tag_ids.length) parts.push(`tag_ids=${filters.tag_ids.join(',')}`);

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
