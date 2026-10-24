import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Mock } from 'vitest';
import { environment } from '../../../environments/environment';
import { SessionToken } from '../models/session.models';
import { RecaptchaService } from './recaptcha.service';
import { SessionService } from './session.service';

describe(
  'SessionService',
  (): void => {
    const sessionUrl: string = `${environment.apiBaseUrl}/session`;
    const start: Date = new Date('2026-11-01T05:59:30Z');
    const fifteenMinutes: number = 15 * 60_000;
    let getToken: Mock<(action: string) => Promise<string>>;

    function sessionService(): SessionService {
      return TestBed.inject(SessionService);
    }

    function http(): HttpTestingController {
      return TestBed.inject(HttpTestingController);
    }

    function issued(token: string, lifetime: number = fifteenMinutes): SessionToken {
      return { token, expiresAt: new Date(Date.now() + lifetime).toISOString() };
    }

    /** reCAPTCHA answers with a promise, so the session request goes out a microtask later. */
    async function sessionRequest(): Promise<TestRequest> {
      await Promise.resolve();
      await Promise.resolve();
      return http().expectOne(sessionUrl);
    }

    function startSession(): void {
      sessionService().getToken().subscribe({ error: (): void => undefined });
    }

    async function tokenOf(): Promise<string | undefined> {
      let token: string | undefined;
      sessionService().getToken().subscribe((value: string): void => {
        token = value;
      });
      await Promise.resolve();
      return token;
    }

    beforeEach((): void => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(start);
      getToken = vi.fn((): Promise<string> => Promise.resolve('made-up-recaptcha_token-1'));
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: RecaptchaService, useValue: { getToken } },
        ],
      });
    });

    afterEach((): void => {
      http().verify();
      vi.useRealTimers();
    });

    it(
      'exchanges a reCAPTCHA token made for the session action',
      async (): Promise<void> => {
        const tokens: string[] = [];
        sessionService().getToken().subscribe((token: string): void => {
          tokens.push(token);
        });
        const request: TestRequest = await sessionRequest();
        request.flush(issued('jwt-a'));

        expect(getToken).toHaveBeenCalledWith('session');
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ recaptchaToken: 'made-up-recaptcha_token-1' });
        expect(tokens).toEqual(['jwt-a']);
      },
    );

    it(
      'shares one session request between concurrent callers and reuses the token after',
      async (): Promise<void> => {
        const tokens: string[] = [];
        for (let caller: number = 0; caller < 3; caller++) {
          sessionService().getToken().subscribe((token: string): void => {
            tokens.push(token);
          });
        }
        (await sessionRequest()).flush(issued('jwt-a'));
        sessionService().getToken().subscribe((token: string): void => {
          tokens.push(token);
        });

        expect(tokens).toEqual([
          'jwt-a',
          'jwt-a',
          'jwt-a',
          'jwt-a',
        ]);
        expect(getToken).toHaveBeenCalledTimes(1);
      },
    );

    it(
      'keeps the token until a minute before it expires, then fetches a new one',
      async (): Promise<void> => {
        startSession();
        (await sessionRequest()).flush(issued('jwt-a'));

        vi.setSystemTime(start.getTime() + fifteenMinutes - 60_001);
        expect(await tokenOf()).toBe('jwt-a');

        vi.setSystemTime(start.getTime() + fifteenMinutes - 60_000);
        startSession();
        (await sessionRequest()).flush(issued('jwt-b'));
        expect(await tokenOf()).toBe('jwt-b');
      },
    );

    it(
      'refreshes a token that is still valid, sharing one request between callers',
      async (): Promise<void> => {
        startSession();
        (await sessionRequest()).flush(issued('jwt-a'));

        const refreshed: string[] = [];
        for (let caller: number = 0; caller < 2; caller++) {
          sessionService().refreshToken().subscribe((token: string): void => {
            refreshed.push(token);
          });
        }
        (await sessionRequest()).flush(issued('jwt-b'));

        expect(refreshed).toEqual(['jwt-b', 'jwt-b']);
      },
    );

    it(
      'flags a failed bot check when the API answers 403 bot_check_failed',
      async (): Promise<void> => {
        let failure: unknown;
        sessionService().getToken().subscribe({
          error: (error: unknown): void => {
            failure = error;
          },
        });
        (await sessionRequest()).flush(
          { status: 403, code: 'bot_check_failed' },
          { status: 403, statusText: 'Forbidden' },
        );

        expect(sessionService().isBotCheckFailed()).toBe(true);
        expect(failure).toBeDefined();
      },
    );

    it(
      'does not flag a bot check for other refusals',
      async (): Promise<void> => {
        startSession();
        (await sessionRequest()).flush(
          { status: 403, code: 'origin_not_allowed' },
          { status: 403, statusText: 'Forbidden' },
        );
        startSession();
        (await sessionRequest()).flush(null, { status: 503, statusText: 'Service Unavailable' });

        expect(sessionService().isBotCheckFailed()).toBe(false);
      },
    );

    it(
      'flags a failed bot check when reCAPTCHA cannot load, and clears it once a token arrives',
      async (): Promise<void> => {
        getToken.mockRejectedValueOnce(new Error('blocked'));
        startSession();
        await Promise.resolve();
        await Promise.resolve();
        http().expectNone(sessionUrl);
        expect(sessionService().isBotCheckFailed()).toBe(true);

        startSession();
        (await sessionRequest()).flush(issued('jwt-a'));
        expect(sessionService().isBotCheckFailed()).toBe(false);
      },
    );

    it(
      'never writes the token to browser storage',
      async (): Promise<void> => {
        const setItem: Mock<Storage['setItem']> = vi.spyOn(Storage.prototype, 'setItem');
        startSession();
        (await sessionRequest()).flush(issued('jwt-a'));

        expect(setItem).not.toHaveBeenCalled();
        setItem.mockRestore();
      },
    );
  },
);
