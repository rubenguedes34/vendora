import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardMetrics {
  total_users: number;
  active_users: number;
  blacklisted_users: number;
  new_users_this_month: number;
  total_transactions: number;
  total_income: number;
  total_expenses: number;
  total_budgeted: number;
  total_invested_initial: number;
  total_invested_current: number;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  blacklisted_at: string | null;
  created_at: string;
  roles: { id: number; name: string }[];
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export interface BudgetsMetrics {
  summary: { total_budgeted: number; count: number };
  by_category: { category: string; type: string; total: number }[];
  by_month: { month: string; total: number }[];
}

export interface InvestmentsMetrics {
  summary: { total_initial: number; total_current: number; count: number };
  by_type: { type: string; total_initial: number; total_current: number; count: number }[];
  by_month: { month: string; total_initial: number; total_current: number }[];
  investments: Paginated<any>;
}

export interface TransactionsMetrics {
  summary: { type: string; total: number; count: number }[];
  by_category: { category_id: number; category: string; type: string; color: string; total: number; count: number }[];
  by_month: { month: string; type: string; total: number }[];
  transactions: Paginated<any>;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private adminUrl(path: string): string {
    return `${this.apiUrl}/admin${path}`;
  }

  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(this.adminUrl('/dashboard-metrics'));
  }

  getUsers(search = '', page = 1): Observable<Paginated<AdminUser>> {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<Paginated<AdminUser>>(this.adminUrl('/users'), { params });
  }

  updateRole(userId: number, role: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/role`, { role });
  }

  toggleBlacklist(userId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${userId}/blacklist`, {});
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  getBudgetsMetrics(year = '', month = '', search = ''): Observable<BudgetsMetrics> {
    let params = new HttpParams();
    if (year) params = params.set('year', year);
    if (month) params = params.set('month', month);
    if (search) params = params.set('search', search);
    return this.http.get<BudgetsMetrics>(this.adminUrl('/budgets-metrics'), { params });
  }

  getInvestmentsMetrics(year = '', type = '', search = '', page = 1): Observable<InvestmentsMetrics> {
    let params = new HttpParams().set('page', page);
    if (year) params = params.set('year', year);
    if (type) params = params.set('type', type);
    if (search) params = params.set('search', search);
    return this.http.get<InvestmentsMetrics>(this.adminUrl('/investments-metrics'), { params });
  }

  getTransactionsMetrics(year = '', month = '', type = '', search = '', page = 1): Observable<TransactionsMetrics> {
    let params = new HttpParams().set('page', page);
    if (year) params = params.set('year', year);
    if (month) params = params.set('month', month);
    if (type) params = params.set('type', type);
    if (search) params = params.set('search', search);
    return this.http.get<TransactionsMetrics>(this.adminUrl('/transactions-metrics'), { params });
  }
}
