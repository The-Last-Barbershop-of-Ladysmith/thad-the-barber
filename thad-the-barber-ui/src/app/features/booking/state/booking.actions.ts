import { createAction, props } from '@ngrx/store';
import { AvailableDay } from '../models/available-day.model';

export enum BookingActionTypes {
  SetActiveMonthView = '[Booking Page] Set Active Month View',
  MonthAvailabilityRequestSuccess = '[Booking API] Month Availability Loaded',
  MonthAvailabilityRequestFailure = '[Booking API] Month Availability Load Failed',
}

/** month: "2026-10"; dispatched again for the same month, it reloads it. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SetActiveMonthView = createAction(
  BookingActionTypes.SetActiveMonthView,
  props<{ month: string; }>(),
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
