import { Notice } from '../../../shared/models/notice.model';
import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { FoundBooking } from '../dtos/found-booking.dto';
import { DayRange } from '../models/day-range.model';
import { LookupStep } from '../models/lookup-step.model';

// The customer's picks, name and phone stay in the booking page's form, never in the store. The bookings a lookup
// found are held only while its page is open, and the page clears them as it opens and as it closes (BR-22).
export interface BookingState {
  dayRange: DayRange | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
  submitStatus: RequestStatus;
  submitNotice: Notice | null;
  lookupStep: LookupStep;
  lookupStatus: RequestStatus;
  lookupNotice: Notice | null;
  foundBookings: FoundBooking[];
}

export const initialBookingState: BookingState = {
  dayRange: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
  submitStatus: RequestStatus.Idle,
  submitNotice: null,
  lookupStep: LookupStep.Phone,
  lookupStatus: RequestStatus.Idle,
  lookupNotice: null,
  foundBookings: [],
};
