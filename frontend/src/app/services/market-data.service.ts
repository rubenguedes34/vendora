import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface MarketSearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  exchange: string;
  change_24h: number | null;
  sparkline: number[];
  logo: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MarketDataService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getTokenValue()}`
    });
  }

  search(q: string): Observable<MarketSearchResult[]> {
    return this.http.get<MarketSearchResult[]>(`${this.apiUrl}/market/search?q=${encodeURIComponent(q)}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(8000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  quote(symbol: string): Observable<MarketQuote> {
    return this.http.get<MarketQuote>(`${this.apiUrl}/market/quote?symbol=${encodeURIComponent(symbol)}`, {
      headers: this.getHeaders()
    }).pipe(
      timeout(10000),
      catchError(err => throwError(() => this.handleError(err)))
    );
  }

  private handleError(error: any): Error {
    if (error.status === 0) return new Error('Network error');
    if (error.status === 404) return new Error('Symbol not found');
    if (error.status === 502 || error.status === 503) return new Error('Market data provider unavailable');
    return new Error(error.error?.error || error.error?.message || 'Market data request failed');
  }
}
