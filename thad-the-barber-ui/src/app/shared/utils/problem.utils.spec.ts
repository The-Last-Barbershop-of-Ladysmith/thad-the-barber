import { HttpErrorResponse } from '@angular/common/http';
import { getProblemCode } from './problem.utils';

describe(
  'getProblemCode',
  (): void => {
    it(
      "reads the ProblemDetails code from the API's error body",
      (): void => {
        const error: HttpErrorResponse = new HttpErrorResponse({ status: 409, error: { code: 'slot_unavailable' } });

        expect(getProblemCode(error)).toBe('slot_unavailable');
      },
    );

    it(
      'returns null for a network error, a body without a code and anything that is not an HTTP error',
      (): void => {
        expect(getProblemCode(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }))).toBeNull();
        expect(getProblemCode(new HttpErrorResponse({ status: 502, error: null }))).toBeNull();
        expect(getProblemCode(new Error('timeout'))).toBeNull();
      },
    );
  },
);
