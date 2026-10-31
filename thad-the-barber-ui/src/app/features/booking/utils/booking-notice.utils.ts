import { ProblemCode } from '../../../shared/models/problem-code.model';
import { getProblemCode } from '../../../shared/utils/problem.utils';
import { Notice } from '../../../shared/models/notice.model';
import { NoticeSeverity } from '../../../shared/models/notice-severity.model';
import { toLongDateTime } from './booking-time.utils';

/**
 * The booking's time on the shop's clock, and, while it's known, the phone the confirmation text goes to. A booking
 * kept from an earlier visit has no phone: it's never saved (BR-22).
 */
export function toBookedNotice(
  timeZone: string,
  startAt: string,
  phone: string | null,
): Notice {
  const appointmentTime: string = `${toLongDateTime(timeZone, startAt)}.`;
  return {
    severity: NoticeSeverity.Success,
    title: 'You’re booked.',
    text: phone ? `${appointmentTime} A text confirmation goes to ${phone}.` : appointmentTime,
    canRetry: false,
  };
}

export const AVAILABILITY_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t load the open times.',
  canRetry: true,
};

/** The days in view have no open times (Square doesn't list closed or full days). */
export const NO_OPEN_DAYS_NOTICE: Notice = {
  severity: NoticeSeverity.Info,
  text: 'No open times in these days.',
  canRetry: false,
};

/** The browser didn't pass reCAPTCHA, so booking here won't work from it at all. */
export const BOT_CHECK_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Warn,
  text: 'We can’t book online from this browser.',
  canRetry: false,
};

const BOOKING_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'That booking didn’t go through.',
  canRetry: true,
};

/** The booking API's ProblemDetails codes the customer can act on (BR-13 for the limits). */
const BOOKING_NOTICES: Record<string, Notice> = {
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
export function toBookingNotice(error: unknown): Notice {
  return BOOKING_NOTICES[getProblemCode(error) ?? ''] ?? BOOKING_FAILED_NOTICE;
}

/** Shown on the manage page right after booking, above the link to keep. */
export const JUST_BOOKED_NOTICE: Notice = {
  severity: NoticeSeverity.Success,
  title: 'You’re booked.',
  text: 'Keep the link below to change or cancel your appointment.',
  canRetry: false,
};

/** A manage link with no token, or one whose booking doesn't exist or doesn't match (404 `booking_not_found`). */
export const BOOKING_NOT_FOUND_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t find that booking.',
  canRetry: false,
};

const BOOKING_LOAD_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t load your booking.',
  canRetry: true,
};

export const BOOKING_CANCELLED_NOTICE: Notice = {
  severity: NoticeSeverity.Info,
  text: 'This appointment was cancelled.',
  canRetry: false,
};

/** A booking can't change once its start time has passed (BR-07). */
export const BOOKING_PASSED_NOTICE: Notice = {
  severity: NoticeSeverity.Info,
  text: 'This appointment has started or passed.',
  canRetry: false,
};

/** Loading a booking from its manage link: not found, or any other failure with a retry. */
export function toManageLoadNotice(error: unknown): Notice {
  const isNotFound: boolean = getProblemCode(error) === ProblemCode.BookingNotFound;
  return isNotFound ? BOOKING_NOT_FOUND_NOTICE : BOOKING_LOAD_FAILED_NOTICE;
}
