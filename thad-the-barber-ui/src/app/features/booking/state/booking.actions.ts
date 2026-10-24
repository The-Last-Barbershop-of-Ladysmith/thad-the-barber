import { createAction, props } from '@ngrx/store';
import {
  BookingConfirmation,
  BookingRequest,
  TimeSlot,
} from '../models/booking.models';

export enum BookingActionTypes {
  /** Clears the slice back to its initial state (also overwrites its saved copy). */
  BookingStateReset = '[Booking Page] State Reset',
  MonthView = '[Booking Page] Month Viewed',
  DateSelect = '[Booking Page] Date Selected',
  TimeSelect = '[Booking Page] Time Selected',
  DetailsEdit = '[Booking Page] Details Edited',
  BookingConfirmRequest = '[Booking Page] Confirm Requested',
  MonthAvailabilityRequestSuccess = '[Booking API] Month Availability Loaded',
  SlotsRequestSuccess = '[Booking API] Slots Loaded',
  SlotsRequestFailure = '[Booking API] Slots Load Failed',
  BookingConfirmRequestSuccess = '[Booking API] Booking Confirmed',
  BookingConfirmRequestFailure = '[Booking API] Booking Failed',
}

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingStateReset = createAction(
  BookingActionTypes.BookingStateReset,
);

/** month: "2026-10" */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const MonthView = createAction(
  BookingActionTypes.MonthView,
  props<{ month: string; }>(),
);

/** date: "2026-10-03" */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const DateSelect = createAction(
  BookingActionTypes.DateSelect,
  props<{ date: string; }>(),
);

/** time: "14:30" */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const TimeSelect = createAction(
  BookingActionTypes.TimeSelect,
  props<{ time: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const DetailsEdit = createAction(
  BookingActionTypes.DetailsEdit,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingConfirmRequest = createAction(
  BookingActionTypes.BookingConfirmRequest,
  props<{ request: BookingRequest; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const MonthAvailabilityRequestSuccess = createAction(
  BookingActionTypes.MonthAvailabilityRequestSuccess,
  props<{ month: string; unavailableDates: string[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SlotsRequestSuccess = createAction(
  BookingActionTypes.SlotsRequestSuccess,
  props<{ date: string; slots: TimeSlot[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SlotsRequestFailure = createAction(
  BookingActionTypes.SlotsRequestFailure,
  props<{ error: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingConfirmRequestSuccess = createAction(
  BookingActionTypes.BookingConfirmRequestSuccess,
  props<{ confirmation: BookingConfirmation; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingConfirmRequestFailure = createAction(
  BookingActionTypes.BookingConfirmRequestFailure,
  props<{ error: string; }>(),
);
