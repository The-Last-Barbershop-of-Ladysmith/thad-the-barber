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
import { SHOP_URL } from '../services/shop.service';

const API_PREFIX: string = `${environment.apiBaseUrl}/`;

/** The anonymous endpoints the browser calls: `/session` issues the token, and `/shop` loads on every page view. */
const ANONYMOUS_URLS: readonly string[] = [SESSION_URL, SHOP_URL];

/**
 * Sends the session token on every API call except the anonymous ones. On a 401 it gets a new token and retries
 * once. The API's other anonymous endpoints (health, Square's webhook) aren't called from the browser.
 */
export const sessionInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const isApiCall: boolean = request.url.startsWith(API_PREFIX);
  const isAnonymousCall: boolean = ANONYMOUS_URLS.includes(request.url);

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
