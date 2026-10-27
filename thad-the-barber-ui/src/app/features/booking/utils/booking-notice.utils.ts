import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../shared/utils/problem.utils';
import { BookingNotice } from '../models/booking-notice.model';
import { NoticeSeverity } from '../models/notice-severity.model';
import { toLongDateTime } from './booking-time.utils';

/**
 * The booking's time on the shop's clock, and, while it's known, the phone the confirmation text goes to. A booking
 * kept from an earlier visit has no phone: it's never saved (BR-22).
 */
export function toBookedNotice(
  timeZone: string,
  startAt: string,
  phone: string | null,
): BookingNotice {
  const appointmentTime: string = `${toLongDateTime(timeZone, startAt)}.`;
  return {
    severity: NoticeSeverity.Success,
    title: 'You’re booked.',
    text: phone ? `${appointmentTime} A text confirmation goes to ${phone}.` : appointmentTime,
    canRetry: false,
  };
}

export const AVAILABILITY_FAILED_NOTICE: BookingNotice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t load the open times.',
  canRetry: true,
};

/** The days in view have no open times (Square doesn't list closed or full days). */
export const NO_OPEN_DAYS_NOTICE: BookingNotice = {
  severity: NoticeSeverity.Info,
  text: 'No open times in these days. Try a later month.',
  canRetry: false,
};

/** The browser didn't pass reCAPTCHA, so booking here won't work from it at all. */
export const BOT_CHECK_FAILED_NOTICE: BookingNotice = {
  severity: NoticeSeverity.Warn,
  text: 'We can’t book online from this browser.',
  canRetry: false,
};

const BOOKING_FAILED_NOTICE: BookingNotice = {
  severity: NoticeSeverity.Error,
  text: 'That booking didn’t go through.',
  canRetry: true,
};

/** The booking API's ProblemDetails codes the customer can act on (BR-13 for the limits). */
const BOOKING_NOTICES: Record<string, BookingNotice> = {
  [ProblemCode.SlotUnavailable]: {
    severity: NoticeSeverity.Warn,
    text: 'That time was just taken, pick another.',
    canRetry: false,
  },
  [ProblemCode.BookingLimit]: {
    severity: NoticeSeverity.Warn,
    text: 'This phone number has reached its limit of upcoming appointments.',
    canRetry: false,
  },
  [ProblemCode.RateLimited]: {
    severity: NoticeSeverity.Warn,
    text: 'Too many booking attempts from this device for now.',
    canRetry: false,
  },
  [ProblemCode.InvalidCustomerDetails]: {
    severity: NoticeSeverity.Warn,
    text: 'That phone number can’t take bookings. Please check it.',
    canRetry: false,
  },
};

/** Any other failure (network, 5xx, or a refusal the page's checks should have caught) offers a retry. */
export function toBookingNotice(error: unknown): BookingNotice {
  return BOOKING_NOTICES[getProblemCode(error) ?? ''] ?? BOOKING_FAILED_NOTICE;
}
