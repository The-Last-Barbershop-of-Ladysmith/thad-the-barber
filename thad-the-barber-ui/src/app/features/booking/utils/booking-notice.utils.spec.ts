import { HttpErrorResponse } from '@angular/common/http';
import { Notice } from '../../../shared/models/notice.model';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { NoticeSeverity } from '../../../shared/models/notice-severity.model';
import {
  BOOKING_CANCELLED_NOTICE,
  BOOKING_NOT_FOUND_NOTICE,
  BOOKING_PASSED_NOTICE,
  toBookingNotice,
  toCancelNotice,
  toManageLoadNotice,
  toRescheduleNotice,
} from './booking-notice.utils';

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

const cases: NoticeCase[] = [
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
  'toBookingNotice',
  (): void => {
    for (const testCase of cases) {
      it(
        `maps ${testCase.name} to its severity and retry, never the raw error`,
        (): void => {
          const notice: Notice = toBookingNotice(testCase.error);

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
  'toManageLoadNotice',
  (): void => {
    it(
      'shows a booking the API can\'t find, or whose token doesn\'t match, as not found, with no retry',
      (): void => {
        expect(toManageLoadNotice(problem(404, ProblemCode.BookingNotFound))).toEqual(BOOKING_NOT_FOUND_NOTICE);
      },
    );

    it(
      'offers a retry for any other failure, never the raw error',
      (): void => {
        const notices: Notice[] = [
          problem(503, 'square_unavailable'),
          new HttpErrorResponse({ status: 0 }),
          new Error(RAW_DETAIL),
        ].map(toManageLoadNotice);

        for (const notice of notices) {
          expect(notice).toEqual({
            severity: NoticeSeverity.Error,
            text: expect.any(String) as string,
            canRetry: true,
          });
          expect(notice.text).not.toContain(RAW_DETAIL);
        }
      },
    );
  },
);

describe(
  'toCancelNotice and toRescheduleNotice',
  (): void => {
    it(
      'say why a booking can no longer change, with no retry',
      (): void => {
        for (const toNotice of [toCancelNotice, toRescheduleNotice]) {
          expect(toNotice(problem(409, ProblemCode.BookingStarted))).toEqual(BOOKING_PASSED_NOTICE);
          expect(toNotice(problem(409, ProblemCode.BookingCancelled))).toEqual(BOOKING_CANCELLED_NOTICE);
          expect(toNotice(problem(404, ProblemCode.BookingNotFound))).toEqual(BOOKING_NOT_FOUND_NOTICE);
          expect(toNotice(problem(429, ProblemCode.RateLimited)).canRetry).toBe(false);
        }
        expect(toRescheduleNotice(problem(409, ProblemCode.SlotUnavailable))).toEqual({
          severity: NoticeSeverity.Warn,
          text: expect.any(String) as string,
          canRetry: false,
        });
      },
    );

    it(
      'offer a retry for any other failure, never the raw error',
      (): void => {
        const failures: unknown[] = [
          problem(503, 'square_unavailable'),
          new HttpErrorResponse({ status: 0 }),
          new Error(RAW_DETAIL),
        ];

        for (const failure of failures) {
          for (const notice of [toCancelNotice(failure), toRescheduleNotice(failure)]) {
            expect(notice.severity).toBe(NoticeSeverity.Error);
            expect(notice.canRetry).toBe(true);
            expect(notice.text).not.toContain(RAW_DETAIL);
          }
        }
      },
    );
  },
);
