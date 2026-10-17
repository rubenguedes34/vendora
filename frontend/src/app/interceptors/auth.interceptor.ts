import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';

// Endpoints where a 401 means "wrong credentials", not "session expired".
const PUBLIC_PATHS = ['/login', '/register', '/setup', '/auth/google/exchange'];

/**
 * Attaches the bearer token to API calls and signs the user out when the
 * backend reports the session is no longer valid.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);
  const translate = inject(TranslateService);
  const isPublic = PUBLIC_PATHS.some((path) => req.url === `${environment.apiUrl}${path}`);
  const token = auth.getTokenValue();

  // The backend localizes validation errors and messages from this header.
  req = req.clone({ setHeaders: { 'Accept-Language': inject(LanguageService).current } });

  if (token && !isPublic && !req.headers.has('Authorization')) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isPublic && auth.getTokenValue()) {
        auth.clearAuth();
        router.navigate(['/login'], {
          queryParams: { error: translate.instant('errors.sessionExpired') },
        });
      }
      return throwError(() => error);
    }),
  );
};
