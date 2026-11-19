import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SmsSignupService, TEXT_UPDATES_SIGN_UP_URL } from './sms-signup.service';

describe(
  'SmsSignupService',
  (): void => {
    beforeEach((): void => {
      TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    });

    afterEach((): void => {
      TestBed.inject(HttpTestingController).verify();
    });

    it(
      'posts the phone with the customer’s consent and completes on 204',
      (): void => {
        let isDone: boolean = false;
        TestBed.inject(SmsSignupService).subscribe('+15550100142').subscribe({
          complete: (): void => {
            isDone = true;
          },
        });

        const call: TestRequest = TestBed.inject(HttpTestingController).expectOne(TEXT_UPDATES_SIGN_UP_URL);
        call.flush(null, { status: 204, statusText: 'No Content' });

        expect(call.request.method).toBe('POST');
        expect(call.request.body).toEqual({ phone: '+15550100142', hasConsent: true });
        expect(isDone).toBe(true);
      },
    );

    it(
      'fails when the API says it could not save the sign-up',
      (): void => {
        let failure: unknown;
        TestBed.inject(SmsSignupService).subscribe('+15550100142').subscribe({
          error: (error: unknown): void => {
            failure = error;
          },
        });

        TestBed.inject(HttpTestingController)
          .expectOne(TEXT_UPDATES_SIGN_UP_URL)
          .flush(null, { status: 503, statusText: 'Service Unavailable' });

        expect(failure).toBeDefined();
      },
    );
  },
);
