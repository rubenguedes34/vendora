import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export type AlertRuleType = 'category_limit' | 'total_spend_limit';

export interface AlertRule {
  id: number;
  type: AlertRuleType;
  category_id: number | null;
  category?: { id: number; name: string } | null;
  threshold: string;
  is_active: boolean;
}

export interface AlertRuleInput {
  type: AlertRuleType;
  category_id?: number | null;
  threshold: number;
}

@Injectable({ providedIn: 'root' })
export class AlertRuleService {
  private readonly url = `${environment.apiUrl}/alert-rules`;

  constructor(private http: HttpClient) {}

  list(): Observable<AlertRule[]> {
    return this.http.get<AlertRule[]>(this.url).pipe(timeout(8000));
  }

  create(rule: AlertRuleInput): Observable<AlertRule> {
    return this.http.post<AlertRule>(this.url, rule).pipe(timeout(8000));
  }

  update(id: number, changes: { threshold?: number; is_active?: boolean }): Observable<AlertRule> {
    return this.http.put<AlertRule>(`${this.url}/${id}`, changes).pipe(timeout(8000));
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/${id}`).pipe(timeout(8000));
  }
}
