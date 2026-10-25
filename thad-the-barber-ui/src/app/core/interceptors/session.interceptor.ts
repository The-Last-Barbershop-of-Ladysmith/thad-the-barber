import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionService } from '../services/session.service';
import { ANONYMOUS_REQUEST } from './anonymous-request.token';

const API_PREFIX: string = `${environment.apiBaseUrl}/`;

/**
 * Sends the session token on every API call except those marked `ANONYMOUS_REQUEST` (`/session`, which issues it,
 * and `/shop`). On a 401 it gets a new token and retries once.
 */
export const sessionInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const isApiCall: boolean = request.url.startsWith(API_PREFIX);
  const isAnonymousCall: boolean = request.context.get(ANONYMOUS_REQUEST);

  if (!isApiCall || isAnonymousCall) {
    return next(request);
  }

  const sessionService: SessionService = inject(SessionService);
  let sentToken: string = '';

  function sendWithAuth(token: string): Observable<HttpEvent<unknown>> {
    sentToken = token;
    const clonedRequest: HttpRequest<unknown> = request.clone(
      { setHeaders: { Authorization: `Bearer ${token}` } },
    );
    return next(clonedRequest);
  }

  return sessionService.getToken().pipe(
    switchMap(sendWithAuth),
    catchError((error: unknown): Observable<HttpEvent<unknown>> => {
      const isUnauthorized: boolean = error instanceof HttpErrorResponse && error.status === 401;
      if (!isUnauthorized) {
        return throwError((): unknown => error);
      }
      return sessionService
        .refreshToken(sentToken)
        .pipe(switchMap(sendWithAuth));
    }),
  );
};
