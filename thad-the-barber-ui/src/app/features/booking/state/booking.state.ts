import { Notice } from '../../../shared/models/notice.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { DayRange } from '../models/day-range.model';

// The customer's picks, name and phone stay in the booking page's form, never in the store. The lookup token is the
// one thing kept: it lets the lookup page skip a second text code, and the tab's `sessionStorage` holds it.
export interface BookingState {
  dayRange: DayRange | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
  submitStatus: RequestStatus;
  submitNotice: Notice | null;
  lookupToken: string | null;
}

export const bookingFeatureKey: 'booking' = 'booking' as const;

export const initialBookingState: BookingState = {
  dayRange: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
  submitStatus: RequestStatus.Idle,
  submitNotice: null,
  lookupToken: null,
};
