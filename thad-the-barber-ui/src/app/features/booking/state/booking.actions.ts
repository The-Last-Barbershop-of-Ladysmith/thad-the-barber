import { createAction, props } from '@ngrx/store';
import { AvailableDay } from '../models/available-day.model';
import { SavedConfirmation } from '../models/saved-confirmation.model';

export enum BookingActionTypes {
  SetActiveMonthView = '[Booking Page] Set Active Month View',
  BookingConfirm = '[Booking Page] Booking Confirmed',
  MonthAvailabilityRequestSuccess = '[Booking API] Month Availability Loaded',
  MonthAvailabilityRequestFailure = '[Booking API] Month Availability Load Failed',
}

/** month: "2026-10"; dispatched again for the same month, it reloads it. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SetActiveMonthView = createAction(
  BookingActionTypes.SetActiveMonthView,
  props<{ month: string; }>(),
);

/** Keeps the booking for 24 hours, replacing any earlier one (BR-22). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingConfirm = createAction(
  BookingActionTypes.BookingConfirm,
  props<{ savedConfirmation: SavedConfirmation; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const MonthAvailabilityRequestSuccess = createAction(
  BookingActionTypes.MonthAvailabilityRequestSuccess,
  props<{ month: string; availableDays: AvailableDay[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const MonthAvailabilityRequestFailure = createAction(
  BookingActionTypes.MonthAvailabilityRequestFailure,
  props<{ month: string; }>(),
);
