import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ApiError } from '../models/api';

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
  providedIn: 'root',
})
export class MarketDataService {
  private apiUrl = environment.apiUrl;

  private translate = inject(TranslateService);

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  search(q: string): Observable<MarketSearchResult[]> {
    return this.http
      .get<MarketSearchResult[]>(`${this.apiUrl}/market/search?q=${encodeURIComponent(q)}`)
      .pipe(
        timeout(8000),
        catchError((err) => throwError(() => this.handleError(err))),
      );
  }

  quote(symbol: string): Observable<MarketQuote> {
    return this.http
      .get<MarketQuote>(`${this.apiUrl}/market/quote?symbol=${encodeURIComponent(symbol)}`)
      .pipe(
        timeout(10000),
        catchError((err) => throwError(() => this.handleError(err))),
      );
  }

  private handleError(error: ApiError): Error {
    if (error.status === 0) return new Error(this.translate.instant('errors.network'));
    if (error.status === 404) return new Error(this.translate.instant('errors.symbolNotFound'));
    if (error.status === 502 || error.status === 503)
      return new Error(this.translate.instant('errors.providerUnavailable'));
    return new Error(
      error.error?.error || error.error?.message || this.translate.instant('errors.marketFailed'),
    );
  }
}
