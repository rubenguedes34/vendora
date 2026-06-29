import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface FinancialRecord {
  id?: number;
  user_id: number;
  year: number;
  month: number;
  monthly_income: number;
  monthly_expenses: number;
  savings_goal: number;
  savings_goal_type: 'percentage' | 'fixed';
  savings?: number;
  savings_goal_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetSummary {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  balance: number;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  icon?: string;
  color?: string;
  type: 'income' | 'expense' | 'savings';
  budgets?: Budget[];
}

export interface Budget {
  id?: number;
  user_id: number;
  category_id: number;
  amount: number;
  month: string;
  category?: Category;
}

@Injectable({
  providedIn: 'root'
})
export class FinancialService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getTokenValue();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  private handleError(error: any): any {
    if (error.name === 'TimeoutError') {
      return { message: 'Request timeout. Please check your connection and try again.' };
    }
    if (error.status === 0) {
      return { message: 'Unable to connect to server. Please check if the backend is running.' };
    }
    if (error.status === 401) {
      return { message: 'Session expired. Please log in again.' };
    }
    return error.error || { message: 'An error occurred. Please try again.' };
  }

  getCurrentRecord(): Observable<FinancialRecord> {
    return this.http.get<FinancialRecord>(`${this.apiUrl}/financial-records/current`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  getYearRecords(year: number): Observable<FinancialRecord[]> {
    return this.http.get<FinancialRecord[]>(`${this.apiUrl}/financial-records/year/${year}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  saveRecord(record: Partial<FinancialRecord>): Observable<FinancialRecord> {
    return this.http.post<FinancialRecord>(`${this.apiUrl}/financial-records`, record, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  updateRecord(id: number, record: Partial<FinancialRecord>): Observable<FinancialRecord> {
    return this.http.put<FinancialRecord>(`${this.apiUrl}/financial-records/${id}`, record, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  getCategoriesByType(type: 'income' | 'expense' | 'savings'): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories-by-type/${type}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  saveBudget(categoryId: number, amount: number, month: string): Observable<Budget> {
    return this.http.post<Budget>(`${this.apiUrl}/budgets`, {
      category_id: categoryId,
      amount: amount,
      month: month
    }, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  getBudgetSummary(month?: string): Observable<BudgetSummary> {
    const url = month
      ? `${this.apiUrl}/budgets/summary/${month}`
      : `${this.apiUrl}/budgets/summary`;

    return this.http.get<BudgetSummary>(url, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }
}
