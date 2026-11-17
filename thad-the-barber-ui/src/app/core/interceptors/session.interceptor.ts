import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminTokenService } from '../services/admin-token.service';
import { SessionService } from '../services/session.service';
import { ANONYMOUS_REQUEST } from './anonymous-request.token';

const API_PREFIX: string = `${environment.apiBaseUrl}/`;
const ADMIN_PREFIX: string = `${API_PREFIX}admin/`;

/** Signing in and its page's config are admin URLs too, but they happen before there is an admin token. */
const ADMIN_SIGN_IN_URLS: readonly string[] = [`${ADMIN_PREFIX}session`, `${ADMIN_PREFIX}config`];

/** `/api/admin/*`, which needs the admin token, except the two calls that come before it. */
export function isAdminCall(url: string): boolean {
  return url.startsWith(ADMIN_PREFIX) && !ADMIN_SIGN_IN_URLS.includes(url.split('?')[0] ?? url);
}

/**
 * Sends the session token on every API call except those marked `ANONYMOUS_REQUEST`: `/session`, which issues it, and
 * the public reads (`/shop`, `/reviews`, `/gallery`, `/announcements`). On a 401 it gets a new token and retries once.
 * Admin calls (`/admin/*`) carry the admin token instead, and a 401 there is the admin's sign-in ending, not a new
 * visitor session to fetch.
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

  if (isAdminCall(request.url)) {
    const adminToken: string | null = inject(AdminTokenService).getToken();
    return next(adminToken ? request.clone({ setHeaders: { Authorization: `Bearer ${adminToken}` } }) : request);
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
