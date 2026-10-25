import { HttpErrorResponse } from '@angular/common/http';
import { BookingNotice } from '../models/booking-notice.model';
import { ProblemCode } from '../../../shared/models/problem-code.model';
import { NoticeFallback } from '../models/notice-fallback.model';
import { NoticeSeverity } from '../models/notice-severity.model';
import { toBookingNotice } from './booking-notice.utils';

const RAW_DETAIL: string = 'Made-up server detail that must never reach the page';

interface NoticeCase {
  name: string;
  error: unknown;
  severity: NoticeSeverity;
  fallback: NoticeFallback;
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
    fallback: NoticeFallback.None,
    canRetry: false,
  },
  {
    name: '409 booking_limit',
    error: problem(409, ProblemCode.BookingLimit),
    severity: NoticeSeverity.Warn,
    fallback: NoticeFallback.Contact,
    canRetry: false,
  },
  {
    name: '429 rate_limited',
    error: problem(429, ProblemCode.RateLimited),
    severity: NoticeSeverity.Warn,
    fallback: NoticeFallback.BookingSite,
    canRetry: false,
  },
  {
    name: '400 invalid_customer_details',
    error: problem(400, ProblemCode.InvalidCustomerDetails),
    severity: NoticeSeverity.Warn,
    fallback: NoticeFallback.Contact,
    canRetry: false,
  },
  {
    name: 'another 4xx',
    error: problem(400, 'validation_failed'),
    severity: NoticeSeverity.Error,
    fallback: NoticeFallback.BookingSite,
    canRetry: true,
  },
  {
    name: '503 square_unavailable',
    error: problem(503, 'square_unavailable'),
    severity: NoticeSeverity.Error,
    fallback: NoticeFallback.BookingSite,
    canRetry: true,
  },
  {
    name: 'a network error',
    error: new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }),
    severity: NoticeSeverity.Error,
    fallback: NoticeFallback.BookingSite,
    canRetry: true,
  },
  {
    name: 'a failed bot check before the request',
    error: new Error(RAW_DETAIL),
    severity: NoticeSeverity.Error,
    fallback: NoticeFallback.BookingSite,
    canRetry: true,
  },
];

describe(
  'toBookingNotice',
  (): void => {
    for (const testCase of cases) {
      it(
        `maps ${testCase.name} to its severity, fallback and retry, never the raw error`,
        (): void => {
          const notice: BookingNotice = toBookingNotice(testCase.error);

          expect(notice).toEqual({
            severity: testCase.severity,
            text: expect.any(String) as string,
            fallback: testCase.fallback,
            canRetry: testCase.canRetry,
          });
          expect(notice.text).not.toContain(RAW_DETAIL);
        },
      );
    }
  },
);
