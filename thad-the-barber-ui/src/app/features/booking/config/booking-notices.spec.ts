import { HttpErrorResponse } from '@angular/common/http';
import { Notice } from '../../../shared/models/notice.model';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { NoticeSeverity } from '../../../shared/models/notice-severity.model';
import { toProblemNotice } from '../../../shared/utils/problem.utils';
import {
  BOOKING_CHANGED_NOTICE,
  BOOKING_FAILED_NOTICE,
  BOOKING_PROBLEM_NOTICES,
  CANCEL_FAILED_NOTICE,
  CHANGE_PROBLEM_NOTICES,
  RESCHEDULE_FAILED_NOTICE,
  SLOT_TAKEN_NOTICE,
} from './booking-notices';

const RAW_DETAIL: string = 'Made-up server detail that must never reach the page';

interface NoticeCase {
  name: string;
  error: unknown;
  severity: NoticeSeverity;
  canRetry: boolean;
}

function problem(status: number, code: string): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    error: {
      status,
      code,
      title: RAW_DETAIL,
      detail: RAW_DETAIL,
    },
  });
}

const bookingCases: NoticeCase[] = [
  {
    name: '409 slot_unavailable',
    error: problem(409, ProblemCode.SlotUnavailable),
    severity: NoticeSeverity.Warn,
    canRetry: false,
  },
  {
    name: '409 booking_limit',
    error: problem(409, ProblemCode.BookingLimit),
    severity: NoticeSeverity.Warn,
    canRetry: false,
  },
  {
    name: '429 rate_limited',
    error: problem(429, ProblemCode.RateLimited),
    severity: NoticeSeverity.Warn,
    canRetry: false,
  },
  {
    name: '400 invalid_customer_details',
    error: problem(400, ProblemCode.InvalidCustomerDetails),
    severity: NoticeSeverity.Warn,
    canRetry: false,
  },
  {
    name: 'another 4xx',
    error: problem(400, 'validation_failed'),
    severity: NoticeSeverity.Error,
    canRetry: true,
  },
  {
    name: '503 square_unavailable',
    error: problem(503, 'square_unavailable'),
    severity: NoticeSeverity.Error,
    canRetry: true,
  },
  {
    name: 'a network error',
    error: new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
    severity: NoticeSeverity.Error,
    canRetry: true,
  },
  {
    name: 'a failed bot check before the request',
    error: new Error(RAW_DETAIL),
    severity: NoticeSeverity.Error,
    canRetry: true,
  },
];

describe(
  'BOOKING_PROBLEM_NOTICES',
  (): void => {
    for (const testCase of bookingCases) {
      it(
        `maps ${testCase.name} to its severity and retry, never the raw error`,
        (): void => {
          const notice: Notice = toProblemNotice(
            testCase.error,
            BOOKING_PROBLEM_NOTICES,
            BOOKING_FAILED_NOTICE,
          );

          expect(notice).toEqual({
            severity: testCase.severity,
            text: expect.any(String) as string,
            canRetry: testCase.canRetry,
          });
          expect(notice.text).not.toContain(RAW_DETAIL);
        },
      );
    }
  },
);

describe(
  'CHANGE_PROBLEM_NOTICES',
  (): void => {
    it(
      'say a booking that started, was cancelled or is gone can no longer change',
      (): void => {
        const codes: string[] = [
          ProblemCode.BookingStarted,
          ProblemCode.BookingCancelled,
          ProblemCode.BookingNotFound,
        ];

        for (const code of codes) {
          expect(CHANGE_PROBLEM_NOTICES[code]).toEqual(BOOKING_CHANGED_NOTICE);
        }
      },
    );

    it(
      'say why retrying won\'t help for a taken time or too many changes',
      (): void => {
        expect(CHANGE_PROBLEM_NOTICES[ProblemCode.SlotUnavailable]).toEqual(SLOT_TAKEN_NOTICE);
        expect(CHANGE_PROBLEM_NOTICES[ProblemCode.RateLimited]?.canRetry).toBe(false);
      },
    );

    it(
      'leave anything else to the failed notice, which offers a retry',
      (): void => {
        const failures: unknown[] = [
          problem(503, 'square_unavailable'),
          new HttpErrorResponse({ status: 0 }),
          new Error(RAW_DETAIL),
        ];

        for (const failure of failures) {
          expect(toProblemNotice(
            failure,
            CHANGE_PROBLEM_NOTICES,
            CANCEL_FAILED_NOTICE,
          )).toEqual(CANCEL_FAILED_NOTICE);
        }
        expect(CANCEL_FAILED_NOTICE.canRetry).toBe(true);
        expect(RESCHEDULE_FAILED_NOTICE.canRetry).toBe(true);
      },
    );
  },
);
