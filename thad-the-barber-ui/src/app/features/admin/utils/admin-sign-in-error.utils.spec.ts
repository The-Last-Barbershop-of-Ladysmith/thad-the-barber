import { HttpErrorResponse } from '@angular/common/http';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { AdminSignInError } from '../models/admin-sign-in-error.model';
import { toAdminSignInError } from './admin-sign-in-error.utils';
import { toSignInMessage } from './sign-in-message.utils';

function problem(code: string, status: number): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: { code },
  });
}

describe(
  'toAdminSignInError',
  (): void => {
    it(
      'tells each of the API’s sign-in problems apart',
      (): void => {
        expect(toAdminSignInError(problem(ProblemCode.NotAuthorized, 403))).toBe(AdminSignInError.NotAuthorized);
        expect(toAdminSignInError(problem(ProblemCode.InvalidIdToken, 401))).toBe(AdminSignInError.InvalidToken);
        expect(toAdminSignInError(problem(ProblemCode.AdminUnavailable, 503))).toBe(AdminSignInError.Unavailable);
      },
    );

    it(
      'treats any other failure, including the network, as a plain failure',
      (): void => {
        expect(toAdminSignInError(problem('internal_error', 500))).toBe(AdminSignInError.Failed);
        expect(toAdminSignInError(new HttpErrorResponse({ status: 0 }))).toBe(AdminSignInError.Failed);
        expect(toAdminSignInError(new Error('boom'))).toBe(AdminSignInError.Failed);
      },
    );
  },
);

describe(
  'toSignInMessage',
  (): void => {
    it(
      'gives every problem its own words',
      (): void => {
        const messages: string[] = Object.values(AdminSignInError).map(toSignInMessage);

        expect(new Set(messages).size).toBe(messages.length);
        messages.forEach((message: string): void => {
          expect(message.length).toBeGreaterThan(10);
        });
      },
    );
  },
);
