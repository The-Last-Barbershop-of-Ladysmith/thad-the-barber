import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  Observable,
  catchError,
  switchMap,
  throwError,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../services/session.service';

/**
 * Sends the session token on every API call except `/session`, which issues it. On a 401 it gets a new token and
 * retries once. The API's other anonymous endpoints (health, Square's webhook) aren't called from the browser.
 */
export const sessionInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const isApiCall: boolean = request.url.startsWith(`${environment.apiBaseUrl}/`);
  const isSessionCall: boolean = request.url === `${environment.apiBaseUrl}/session`;

  if (!isApiCall || isSessionCall) {
    return next(request);
  }

  const sessionService: SessionService = inject(SessionService);
  const sendWithAuth: (token: string) => Observable<HttpEvent<unknown>> =
    (token: string): Observable<HttpEvent<unknown>> =>
      next(
        request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
      );

  return sessionService
    .getToken()
    .pipe(
      switchMap((token: string): Observable<HttpEvent<unknown>> => sendWithAuth(token).pipe(
        catchError((error: unknown): Observable<HttpEvent<unknown>> => {
          const isUnauthorized: boolean = error instanceof HttpErrorResponse && error.status === 401;
          if (!isUnauthorized) {
            return throwError((): unknown => error);
          }
          return sessionService.refreshToken().pipe(switchMap(sendWithAuth));
        }),
      )),
    );
};
