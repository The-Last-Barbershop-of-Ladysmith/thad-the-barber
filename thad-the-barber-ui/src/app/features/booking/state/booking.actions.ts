import { createAction, props } from '@ngrx/store';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';

export enum BookingActionTypes {
  SetAvailabilityView = '[Booking Page] Set Availability View',
  BookingConfirm = '[Booking Page] Booking Confirmed',
  SavedConfirmationsAdopt = '[Booking Tabs] Saved Confirmations Adopted',
  AvailabilityRequestSuccess = '[Booking API] Availability Loaded',
  AvailabilityRequestFailure = '[Booking API] Availability Load Failed',
}

/** Dispatched again for the same view, it reloads it. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SetAvailabilityView = createAction(
  BookingActionTypes.SetAvailabilityView,
  props<{ availabilityView: AvailabilityView; }>(),
);

/** Adds the booking to this device's list, kept until it starts (BR-22). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingConfirm = createAction(
  BookingActionTypes.BookingConfirm,
  props<{ bookingConfirmation: BookingConfirmation; }>(),
);

/** Replaces this tab's list with the one another tab saved. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SavedConfirmationsAdopt = createAction(
  BookingActionTypes.SavedConfirmationsAdopt,
  props<{ savedConfirmations: BookingConfirmation[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityRequestSuccess = createAction(
  BookingActionTypes.AvailabilityRequestSuccess,
  props<{ availabilityView: AvailabilityView; availableDays: AvailableDay[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityRequestFailure = createAction(
  BookingActionTypes.AvailabilityRequestFailure,
  props<{ availabilityView: AvailabilityView; }>(),
);
