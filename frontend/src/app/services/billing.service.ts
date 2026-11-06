import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Plan = 'monthly' | 'yearly';

export interface BillingStatus {
  premium: boolean;
  status: string | null;
  cancels_at: string | null;
  has_customer: boolean;
  plans: Plan[];
  pricing: { monthly: number; yearly: number; discount: number };
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private apiUrl = `${environment.apiUrl}/billing`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<BillingStatus> {
    return this.http.get<BillingStatus>(this.apiUrl);
  }

  checkout(plan: Plan): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.apiUrl}/checkout`, { plan });
  }

  portal(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(`${this.apiUrl}/portal`, {});
  }
}
