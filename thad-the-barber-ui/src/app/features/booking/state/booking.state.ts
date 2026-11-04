import { Notice } from '../../../shared/models/notice.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { DayRange } from '../models/day-range.model';

// The customer's picks, name and phone stay in the booking page's form, never in the store.
export interface BookingState {
  dayRange: DayRange | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
  submitStatus: RequestStatus;
  submitNotice: Notice | null;
}

export const initialBookingState: BookingState = {
  dayRange: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
  submitStatus: RequestStatus.Idle,
  submitNotice: null,
};
