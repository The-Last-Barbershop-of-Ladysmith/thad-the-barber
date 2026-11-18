import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AdminTokenService } from '../services/admin-token.service';
import { RecaptchaService } from '../services/recaptcha.service';
import { isAdminCall, sessionInterceptor } from './session.interceptor';

describe(
  'isAdminCall',
  (): void => {
    const api: string = environment.apiBaseUrl;

    it(
      'is true for the admin area',
      (): void => {
        expect(isAdminCall(`${api}/admin/me`)).toBe(true);
        expect(isAdminCall(`${api}/admin/announcements?x=1`)).toBe(true);
      },
    );

    it(
      'is false for signing in and its config, which come before there is an admin token',
      (): void => {
        expect(isAdminCall(`${api}/admin/session`)).toBe(false);
        expect(isAdminCall(`${api}/admin/config`)).toBe(false);
        expect(isAdminCall(`${api}/admin/config?x=1`)).toBe(false);
      },
    );

    it(
      'is false for everything else',
      (): void => {
        expect(isAdminCall(`${api}/bookings`)).toBe(false);
        expect(isAdminCall('https://other.example.com/admin/me')).toBe(false);
      },
    );
  },
);

describe(
  'sessionInterceptor for admin calls',
  (): void => {
    const meUrl: string = `${environment.apiBaseUrl}/admin/me`;
    let http: HttpTestingController;
    let recaptchaTokens: number;

    // The admin sign-in is kept in the tab's session storage, which outlives a test.

    beforeEach((): void => {

      sessionStorage.clear();

    });


    beforeEach((): void => {
      recaptchaTokens = 0;
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(withInterceptors([sessionInterceptor])),
          provideHttpClientTesting(),
          {
            provide: RecaptchaService,
            useValue: {
              getToken: (): Promise<string> => {
                recaptchaTokens++;
                return Promise.resolve('recaptcha-token');
              },
            },
          },
        ],
      });
      http = TestBed.inject(HttpTestingController);
    });

    afterEach((): void => {
      http.verify();
    });

    it(
      'sends the admin token, with no visitor session fetched',
      (): void => {
        TestBed.inject(AdminTokenService).set('admin-jwt', Date.now() + 60_000);

        TestBed.inject(HttpClient).get(meUrl).subscribe();

        const request: TestRequest = http.expectOne(meUrl);
        expect(request.request.headers.get('Authorization')).toBe('Bearer admin-jwt');
        expect(recaptchaTokens).toBe(0);
        request.flush({});
      },
    );

    it(
      'sends no token when there is none, and a 401 is not retried with a visitor session',
      (): void => {
        let status: number = 0;
        TestBed.inject(HttpClient).get(meUrl).subscribe({
          error: (error: { status: number; }): void => {
            status = error.status;
          },
        });

        const request: TestRequest = http.expectOne(meUrl);
        expect(request.request.headers.has('Authorization')).toBe(false);
        request.flush({}, { status: 401, statusText: 'Unauthorized' });
        expect(status).toBe(401);
        expect(recaptchaTokens).toBe(0);
      },
    );
  },
);
