import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, WritableSignal, inject, signal } from '@angular/core';
import { Observable, catchError, defer, finalize, map, of, share, switchMap, tap, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProblemCode } from '../../shared/models/problem-code.model';
import { getProblemCode } from '../../shared/utils/problem.utils';
import { anonymousRequest } from '../interceptors/anonymous-request.token';
import { SessionToken } from '../models/session.models';
import { RecaptchaService } from './recaptcha.service';

export const SESSION_URL: string = `${environment.apiBaseUrl}/session`;

/** Must match the API's `SessionService.RecaptchaAction`. */
const RECAPTCHA_ACTION: string = 'session';
const REFRESH_BEFORE_EXPIRY_MS: number = 60_000;
const RECAPTCHA_TIMEOUT_MS: number = 10_000;

/**
 * The session JWT from `POST /api/session`, kept in memory only, never in storage. A new one is fetched when a
 * request needs it and the last is within a minute of expiry, rather than on a timer, so an idle tab never spends
 * reCAPTCHA assessments.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly recaptchaService: RecaptchaService = inject(RecaptchaService);

  private token: string = '';
  private refreshAt: number = 0;
  private pendingToken: Observable<string> | null = null;
  private readonly botCheckFailed: WritableSignal<boolean> = signal(false);

  readonly isBotCheckFailed: Signal<boolean> = this.botCheckFailed.asReadonly();

  /** Callers that ask while a token is being fetched share that fetch. */
  getToken(): Observable<string> {
    const isTokenFresh: boolean = Date.now() < this.refreshAt;
    if (isTokenFresh) {
      return of(this.token);
    }
    if (!this.pendingToken) {
      this.pendingToken = this.requestSession().pipe(
        finalize((): void => {
          this.pendingToken = null;
        }),
        share(),
      );
    }
    return this.pendingToken;
  }

  /** A new token unless `rejectedToken` was already replaced, as when several requests get a 401 for it. */
  refreshToken(rejectedToken: string): Observable<string> {
    const isCurrentToken: boolean = rejectedToken === this.token;
    if (isCurrentToken) {
      this.refreshAt = 0;
    }
    return this.getToken();
  }

  private requestSession(): Observable<string> {
    return defer((): Promise<string> => this.recaptchaService.getToken(RECAPTCHA_ACTION)).pipe(
      timeout(RECAPTCHA_TIMEOUT_MS),
      catchError((error: unknown): Observable<never> => {
        this.botCheckFailed.set(true);
        return throwError((): unknown => error);
      }),
      switchMap((recaptchaToken: string): Observable<SessionToken> =>
        this.http.post<SessionToken>(
          SESSION_URL,
          { recaptchaToken },
          { context: anonymousRequest() },
        )),
      tap({
        next: (session: SessionToken): void => {
          this.token = session.token;
          this.refreshAt = Date.parse(session.expiresAt) - REFRESH_BEFORE_EXPIRY_MS;
          this.botCheckFailed.set(false);
        },
        error: (error: unknown): void => {
          const isRefusal: boolean = error instanceof HttpErrorResponse && isBotCheckRefusal(error);
          if (isRefusal) {
            this.botCheckFailed.set(true);
          }
        },
      }),
      map((session: SessionToken): string => session.token),
    );
  }
}

function isBotCheckRefusal(error: HttpErrorResponse): boolean {
  const isForbidden: boolean = error.status === 403;
  const isBotCheckCode: boolean = getProblemCode(error) === ProblemCode.BotCheckFailed;
  return isForbidden && isBotCheckCode;
}
