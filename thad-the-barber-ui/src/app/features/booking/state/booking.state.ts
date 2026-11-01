import { Notice } from '../../../shared/models/notice.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';

/**
 * The days in view (`availabilityView`: a month or a 31-day block, as its first and last day; null until the first
 * load), with their open days, where a picked day's times come from, and the bookings made on this device, soonest
 * first, each kept until it starts (`savedConfirmations`, the only part saved to localStorage, BR-22). The booking or
 * move being sent (`submitStatus`, `submitNotice`, `idempotencyKey`) starts over each time the booking page opens; the
 * picked date and time and the customer's details live in the page's form, never here.
 */
export interface BookingState {
  availabilityView: AvailabilityView | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
  savedConfirmations: BookingConfirmation[];
  /** `Success` once the booking or move went through, as the page leaves: nothing more is sent. */
  submitStatus: RequestStatus;
  /** Why the last send failed, or the booking confirmed on the page when its own page didn't open. */
  submitNotice: Notice | null;
  /** Kept while the same booking is retried, so a booking whose response was lost isn't made twice. */
  idempotencyKey: string | null;
}

export const initialBookingState: BookingState = {
  availabilityView: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
  savedConfirmations: [],
  submitStatus: RequestStatus.Idle,
  submitNotice: null,
  idempotencyKey: null,
};
