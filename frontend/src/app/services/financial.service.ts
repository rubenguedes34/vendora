import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
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
  private categoryCache = new Map<string, Observable<Category[]>>();
  private allCategoriesCache: Observable<Category[]> | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  clearCategoryCache(): void {
    this.categoryCache.clear();
    this.allCategoriesCache = null;
  }

  getAllCategories(): Observable<Category[]> {
    if (!this.allCategoriesCache) {
      this.allCategoriesCache = this.http.get<Category[]>(`${this.apiUrl}/categories`, {
        headers: this.getHeaders()
      }).pipe(
        timeout(5000),
        catchError(error => throwError(() => this.handleError(error))),
        shareReplay(1)
      );
    }
    return this.allCategoriesCache;
  }

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

  getExpensesByCategory(month: string): Observable<{ category: string; color: string; total: number }[]> {
    return this.http.get<{ category: string; color: string; total: number }[]>(
      `${this.apiUrl}/transactions/expenses-by-category?month=${month}`,
      { headers: this.getHeaders() }
    ).pipe(
      timeout(5000),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  createCategory(data: { name: string; type: 'income' | 'expense' | 'savings'; icon?: string }): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, data, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      tap(() => this.clearCategoryCache()),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/categories/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(5000),
      tap(() => this.clearCategoryCache()),
      catchError(error => throwError(() => this.handleError(error)))
    );
  }

  getCategoriesByType(type: 'income' | 'expense' | 'savings'): Observable<Category[]> {
    if (!this.categoryCache.has(type)) {
      const req = this.http.get<Category[]>(`${this.apiUrl}/categories-by-type/${type}`, {
        headers: this.getHeaders()
      }).pipe(
        timeout(5000),
        catchError(error => throwError(() => this.handleError(error))),
        shareReplay(1)
      );
      this.categoryCache.set(type, req);
    }
    return this.categoryCache.get(type)!;
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
