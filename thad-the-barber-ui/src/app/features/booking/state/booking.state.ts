import { RequestStatus } from '../../../shared/models/request.models';
import { AvailableDay } from '../dtos/available-day.dto';
import { SavedConfirmation } from '../models/saved-confirmation.model';

/**
 * The days in view, a month ("2026-10") or, while `visibleMonth` is null, the upcoming days from the shop's current
 * date, with their open days, where a picked day's times come from, and the last booking for
 * 24 hours (`savedConfirmation`, the only part saved to localStorage). The picked date and time, the customer's details
 * and the booking in progress live in the booking page.
 */
export interface BookingState {
  visibleMonth: string | null;
  availableDays: AvailableDay[];
  loadStatus: RequestStatus;
  savedConfirmation: SavedConfirmation | null;
}

export const initialBookingState: BookingState = {
  visibleMonth: null,
  availableDays: [],
  loadStatus: RequestStatus.Idle,
  savedConfirmation: null,
};
