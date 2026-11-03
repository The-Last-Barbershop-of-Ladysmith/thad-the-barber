import { Notice } from '../../../shared/models/notice.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';

// The customer's picks, name and phone stay in the booking page's form, never in the store.
export interface BookingState {
  availabilityView: AvailabilityView | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
  savedConfirmations: BookingConfirmation[];
  submitStatus: RequestStatus;
  submitNotice: Notice | null;
}

export const initialBookingState: BookingState = {
  availabilityView: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
  savedConfirmations: [],
  submitStatus: RequestStatus.Idle,
  submitNotice: null,
};
