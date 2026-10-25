import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SessionToken } from '../models/session.models';
import { RecaptchaService } from '../services/recaptcha.service';
import { anonymousRequest } from './anonymous-request.token';
import { sessionInterceptor } from './session.interceptor';

describe(
  'sessionInterceptor',
  (): void => {
    const sessionUrl: string = `${environment.apiBaseUrl}/session`;
    const bookingsUrl: string = `${environment.apiBaseUrl}/bookings/booking-1_x?month=2026-11`;
    const availabilityUrl: string = `${environment.apiBaseUrl}/bookings/availability?month=2026-12`;
    let sessionsIssued: number;
    let http: HttpTestingController;

    function get(url: string, context: HttpContext = new HttpContext()): { body: unknown; error: unknown; } {
      const result: { body: unknown; error: unknown; } = { body: undefined, error: undefined };
      TestBed.inject(HttpClient).get(url, { context }).subscribe({
        next: (body: unknown): void => {
          result.body = body;
        },
        error: (error: unknown): void => {
          result.error = error;
        },
      });
      return result;
    }

    /** reCAPTCHA answers with a promise, so the session request goes out a microtask later. */
    async function issueSession(): Promise<string> {
      await Promise.resolve();
      await Promise.resolve();
      sessionsIssued++;
      const token: string = `jwt-${sessionsIssued}`;
      const session: SessionToken = { token, expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
      http.expectOne(sessionUrl).flush(session);
      await Promise.resolve();
      return token;
    }

    function unauthorized(request: TestRequest): void {
      request.flush(null, { status: 401, statusText: 'Unauthorized' });
    }

    function authorization(request: TestRequest): string | null {
      return request.request.headers.get('Authorization');
    }

    beforeEach((): void => {
      sessionsIssued = 0;
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([sessionInterceptor])),
          provideHttpClientTesting(),
          { provide: RecaptchaService, useValue: { getToken: (): Promise<string> => Promise.resolve('made-up-recaptcha') } },
        ],
      });
      http = TestBed.inject(HttpTestingController);
    });

    afterEach((): void => {
      http.verify();
    });

    it(
      'sends the session token on API calls',
      async (): Promise<void> => {
        const result: { body: unknown; } = get(bookingsUrl);
        await issueSession();
        const request: TestRequest = http.expectOne(bookingsUrl);
        request.flush({ id: 'booking-1_x' });

        expect(authorization(request)).toBe('Bearer jwt-1');
        expect(result.body).toEqual({ id: 'booking-1_x' });
      },
    );

    it(
      'sends nothing on calls marked anonymous, whatever their query string',
      (): void => {
        const shopUrl: string = `${environment.apiBaseUrl}/shop?fresh=1`;
        get(shopUrl, anonymousRequest());
        const request: TestRequest = http.expectOne(shopUrl);
        request.flush({});

        expect(authorization(request)).toBeNull();
        expect(sessionsIssued).toBe(0);
      },
    );

    it(
      'sends nothing outside the API',
      (): void => {
        const outside: string[] = [
          `${environment.mediaBaseUrl}/content/announcements.json`,
          `${environment.apiBaseUrl}s/lookalike`,
          'https://example.test/api/bookings',
        ];
        for (const url of outside) {
          get(url);
          const request: TestRequest = http.expectOne(url);
          expect(authorization(request)).toBeNull();
          request.flush({});
        }
        expect(sessionsIssued).toBe(0);
      },
    );

    it(
      'gets one new token on a 401 and retries once with it',
      async (): Promise<void> => {
        const result: { body: unknown; error: unknown; } = get(bookingsUrl);
        await issueSession();
        unauthorized(http.expectOne(bookingsUrl));
        await issueSession();
        const retry: TestRequest = http.expectOne(bookingsUrl);
        retry.flush({ id: 'booking-1_x' });

        expect(authorization(retry)).toBe('Bearer jwt-2');
        expect(result.body).toEqual({ id: 'booking-1_x' });
        expect(result.error).toBeUndefined();
      },
    );

    it(
      'gives up after the one retry',
      async (): Promise<void> => {
        const result: { error: unknown; } = get(bookingsUrl);
        await issueSession();
        unauthorized(http.expectOne(bookingsUrl));
        await issueSession();
        unauthorized(http.expectOne(bookingsUrl));

        expect((result.error as HttpErrorResponse).status).toBe(401);
        expect(sessionsIssued).toBe(2);
      },
    );

    it(
      'passes other errors on without a new token',
      async (): Promise<void> => {
        const result: { error: unknown; } = get(bookingsUrl);
        await issueSession();
        http.expectOne(bookingsUrl).flush({ code: 'slot_unavailable' }, { status: 409, statusText: 'Conflict' });

        expect((result.error as HttpErrorResponse).status).toBe(409);
        expect(sessionsIssued).toBe(1);
      },
    );

    it(
      'retries a late 401 with the token already renewed instead of renewing again',
      async (): Promise<void> => {
        get(bookingsUrl);
        const late: { body: unknown; } = get(availabilityUrl);
        await issueSession();
        unauthorized(http.expectOne(bookingsUrl));
        await issueSession();
        http.expectOne(bookingsUrl).flush({});
        unauthorized(http.expectOne(availabilityUrl));
        await Promise.resolve();
        const retry: TestRequest = http.expectOne(availabilityUrl);
        retry.flush({});

        expect(authorization(retry)).toBe('Bearer jwt-2');
        expect(sessionsIssued).toBe(2);
        expect(late.body).toEqual({});
      },
    );

    it(
      'shares one new token between concurrent requests that got a 401',
      async (): Promise<void> => {
        const first: { body: unknown; } = get(bookingsUrl);
        const second: { body: unknown; } = get(availabilityUrl);
        await issueSession();
        unauthorized(http.expectOne(bookingsUrl));
        unauthorized(http.expectOne(availabilityUrl));
        await issueSession();
        const retries: TestRequest[] = [http.expectOne(bookingsUrl), http.expectOne(availabilityUrl)];
        for (const retry of retries) {
          expect(authorization(retry)).toBe('Bearer jwt-2');
          retry.flush({});
        }

        expect(sessionsIssued).toBe(2);
        expect(first.body).toEqual({});
        expect(second.body).toEqual({});
      },
    );
  },
);
