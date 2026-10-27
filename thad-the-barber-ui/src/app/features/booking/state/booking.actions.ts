import { createAction, props } from '@ngrx/store';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { SavedConfirmation } from '../models/saved-confirmation.model';

export enum BookingActionTypes {
  SetAvailabilityView = '[Booking Page] Set Availability View',
  BookingConfirm = '[Booking Page] Booking Confirmed',
  AvailabilityRequestSuccess = '[Booking API] Availability Loaded',
  AvailabilityRequestFailure = '[Booking API] Availability Load Failed',
}

/** Dispatched again for the same view, it reloads it. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SetAvailabilityView = createAction(
  BookingActionTypes.SetAvailabilityView,
  props<{ view: AvailabilityView; }>(),
);

/** Keeps the booking for 24 hours, replacing any earlier one (BR-22). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingConfirm = createAction(
  BookingActionTypes.BookingConfirm,
  props<{ savedConfirmation: SavedConfirmation; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityRequestSuccess = createAction(
  BookingActionTypes.AvailabilityRequestSuccess,
  props<{ view: AvailabilityView; availableDays: AvailableDay[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityRequestFailure = createAction(
  BookingActionTypes.AvailabilityRequestFailure,
  props<{ view: AvailabilityView; }>(),
);
