import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../models/available-day.model';

/**
 * The calendar's month ("2026-10") and its open days; a picked day's times come from here. Only availability is kept:
 * the picked date and time, the customer's details and the booking itself live in the booking page.
 */
export interface BookingState {
  visibleMonth: string | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
}

export const initialBookingState: BookingState = {
  visibleMonth: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
};
