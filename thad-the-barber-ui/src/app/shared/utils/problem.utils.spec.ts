import { HttpErrorResponse } from '@angular/common/http';
import { Notice } from '../models/notice.model';
import { NoticeSeverity } from '../models/notice-severity.model';
import { getProblemCode, toProblemNotice } from './problem.utils';

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

describe(
  'toProblemNotice',
  (): void => {
    const listedNotice: Notice = {
      severity: NoticeSeverity.Warn,
      text: 'Made-up listed notice',
      canRetry: false,
    };
    const failedNotice: Notice = {
      severity: NoticeSeverity.Error,
      text: 'Made-up failed notice',
      canRetry: true,
    };
    const problemNotices: Record<string, Notice> = { made_up_code: listedNotice };

    it(
      'picks the notice listed for the error\'s code',
      (): void => {
        const error: HttpErrorResponse = new HttpErrorResponse({ status: 409, error: { code: 'made_up_code' } });

        expect(toProblemNotice(
          error,
          problemNotices,
          failedNotice,
        )).toBe(listedNotice);
      },
    );

    it(
      'falls back to the failed notice for an unlisted code, a body without one or any other error',
      (): void => {
        const failures: unknown[] = [
          new HttpErrorResponse({ status: 409, error: { code: 'other_code' } }),
          new HttpErrorResponse({ status: 502, error: null }),
          new Error('timeout'),
        ];

        for (const failure of failures) {
          expect(toProblemNotice(
            failure,
            problemNotices,
            failedNotice,
          )).toBe(failedNotice);
        }
      },
    );
  },
);
