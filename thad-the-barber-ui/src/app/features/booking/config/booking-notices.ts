import { Notice } from '../../../shared/models/notice.model';
import { NoticeSeverity } from '../../../shared/models/notice-severity.model';
import { ProblemCode } from '../../../shared/models/problem-code.model';

// Booking page

export const AVAILABILITY_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t load the open times.',
  canRetry: true,
};

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

export const BOOKING_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'That booking didn’t go through.',
  canRetry: true,
};

export const SLOT_TAKEN_NOTICE: Notice = {
  severity: NoticeSeverity.Warn,
  text: 'That time was just taken, pick another.',
  canRetry: false,
};

// Manage page

export const JUST_BOOKED_NOTICE: Notice = {
  severity: NoticeSeverity.Success,
  title: 'You’re booked.',
  text: 'Keep this link to change or cancel your appointment.',
  canRetry: false,
};

export const BOOKING_NOT_FOUND_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t find that booking.',
  canRetry: false,
};

export const BOOKING_LOAD_FAILED_NOTICE: Notice = {
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

export const BOOKING_CHANGED_NOTICE: Notice = {
  severity: NoticeSeverity.Info,
  text: 'This appointment can’t be changed any more. It has started, been cancelled or been removed.',
  canRetry: false,
};

export const CANCEL_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t cancel your appointment. It’s still booked.',
  canRetry: true,
};

export const RESCHEDULE_FAILED_NOTICE: Notice = {
  severity: NoticeSeverity.Error,
  text: 'We couldn’t move your appointment. It’s still at its old time.',
  canRetry: true,
};

// The API's error codes the customer can act on; any other failure shows the request's failed notice, with a retry.

/** BR-13 for the limits. */
export const BOOKING_PROBLEM_NOTICES: Record<string, Notice> = {
  [ProblemCode.SlotUnavailable]: SLOT_TAKEN_NOTICE,
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

/** A cancel or move. */
export const CHANGE_PROBLEM_NOTICES: Record<string, Notice> = {
  [ProblemCode.SlotUnavailable]: SLOT_TAKEN_NOTICE,
  [ProblemCode.BookingStarted]: BOOKING_CHANGED_NOTICE,
  [ProblemCode.BookingCancelled]: BOOKING_CHANGED_NOTICE,
  [ProblemCode.BookingNotFound]: BOOKING_CHANGED_NOTICE,
  [ProblemCode.RateLimited]: {
    severity: NoticeSeverity.Warn,
    text: 'Too many changes from this device for now.',
    canRetry: false,
  },
};
