import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../shared/utils/problem.utils';
import { BookingNotice } from '../models/booking-notice.model';
import { NoticeFallback } from '../models/notice-fallback.model';
import { NoticeSeverity } from '../models/notice-severity.model';

export const AVAILABILITY_FAILED_NOTICE: BookingNotice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t load the open times.',
  fallback: NoticeFallback.BookingSite,
  canRetry: true,
};

/** The browser didn't pass reCAPTCHA, so booking here won't work from it at all. */
export const BOT_CHECK_FAILED_NOTICE: BookingNotice = {
  severity: NoticeSeverity.Warn,
  text: 'We can’t book online from this browser.',
  fallback: NoticeFallback.BookingSite,
  canRetry: false,
};

const BOOKING_FAILED_NOTICE: BookingNotice = {
  severity: NoticeSeverity.Error,
  text: 'That booking didn’t go through.',
  fallback: NoticeFallback.BookingSite,
  canRetry: true,
};

/**
 * The booking API's ProblemDetails codes the customer can act on (BR-13 for the limits). Square's booking site doesn't
 * know BR-13's cap or take a phone Square refused, so only the rate limit offers it.
 */
const BOOKING_NOTICES: Record<string, BookingNotice> = {
  [ProblemCode.SlotUnavailable]: {
    severity: NoticeSeverity.Warn,
    text: 'That time was just taken, pick another.',
    fallback: NoticeFallback.None,
    canRetry: false,
  },
  [ProblemCode.BookingLimit]: {
    severity: NoticeSeverity.Warn,
    text: 'This phone number has reached its limit of upcoming appointments.',
    fallback: NoticeFallback.Contact,
    canRetry: false,
  },
  [ProblemCode.RateLimited]: {
    severity: NoticeSeverity.Warn,
    text: 'Too many booking attempts from this device for now.',
    fallback: NoticeFallback.BookingSite,
    canRetry: false,
  },
  [ProblemCode.InvalidCustomerDetails]: {
    severity: NoticeSeverity.Warn,
    text: 'That phone number can’t take bookings. Please check it.',
    fallback: NoticeFallback.Contact,
    canRetry: false,
  },
};

/** Any other failure (network, 5xx, or a refusal the page's checks should have caught) offers a retry. */
export function toBookingNotice(error: unknown): BookingNotice {
  return BOOKING_NOTICES[getProblemCode(error) ?? ''] ?? BOOKING_FAILED_NOTICE;
}
