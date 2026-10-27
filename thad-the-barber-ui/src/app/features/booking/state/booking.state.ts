import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { SavedConfirmation } from '../models/saved-confirmation.model';

/**
 * The days in view (`view`: a month or a 31-day block, as its first and last day; null until the first load), with
 * their open days, where a picked day's times come from, and the last booking for
 * 24 hours (`savedConfirmation`, the only part saved to localStorage). The picked date and time, the customer's details
 * and the booking in progress live in the booking page.
 */
export interface BookingState {
  availabilityView: AvailabilityView | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
  savedConfirmation: SavedConfirmation | null;
}

export const initialBookingState: BookingState = {
  availabilityView: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
  savedConfirmation: null,
};
