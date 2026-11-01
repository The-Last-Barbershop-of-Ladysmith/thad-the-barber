import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';

/**
 * The days in view (`availabilityView`: a month or a 31-day block, as its first and last day; null until the first
 * load), with their open days, where a picked day's times come from, and the bookings made on this device, soonest
 * first, each kept until it starts (`savedConfirmations`, the only part saved to localStorage, BR-22). The picked date
 * and time, the customer's details and the booking in progress live in the booking page.
 */
export interface BookingState {
  availabilityView: AvailabilityView | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
  savedConfirmations: BookingConfirmation[];
}

export const initialBookingState: BookingState = {
  availabilityView: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
  savedConfirmations: [],
};
