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
import { SESSION_URL, SessionService } from '../services/session.service';

const API_PREFIX: string = `${environment.apiBaseUrl}/`;

/**
 * Sends the session token on every API call except `/session`, which issues it. On a 401 it gets a new token and
 * retries once. The API's other anonymous endpoints (health, Square's webhook) aren't called from the browser.
 */
export const sessionInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const isApiCall: boolean = request.url.startsWith(API_PREFIX);
  const isSessionCall: boolean = request.url === SESSION_URL;

  if (!isApiCall || isSessionCall) {
    return next(request);
  }

  const sessionService: SessionService = inject(SessionService);

  function sendWithAuth(token: string): Observable<HttpEvent<unknown>> {
    return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }

  return sessionService.getToken().pipe(
    switchMap(sendWithAuth),
    catchError((error: unknown): Observable<HttpEvent<unknown>> => {
      const isUnauthorized: boolean = error instanceof HttpErrorResponse && error.status === 401;
      if (!isUnauthorized) {
        return throwError((): unknown => error);
      }
      return sessionService.refreshToken().pipe(switchMap(sendWithAuth));
    }),
  );
};
