import { createAction, props } from '@ngrx/store';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest as BookingRequestDto } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { Notice } from '../../../shared/models/notice.model';

export enum BookingActionTypes {
  SetAvailabilityView = '[Booking Page] Set Availability View',
  BookingPageOpen = '[Booking Page] Opened',
  BookingRequest = '[Booking Page] Booking Requested',
  RescheduleRequest = '[Booking Page] Reschedule Requested',
  SavedConfirmationsAdopt = '[Booking Tabs] Saved Confirmations Adopted',
  SavedConfirmationRemove = '[Manage Booking Page] Saved Confirmation Removed',
  AvailabilityRequestSuccess = '[Booking API] Availability Loaded',
  AvailabilityRequestFailure = '[Booking API] Availability Load Failed',
  BookingRequestSuccess = '[Booking API] Booking Made',
  BookingRequestFailure = '[Booking API] Booking Failed',
  RescheduleRequestSuccess = '[Booking API] Booking Moved',
  RescheduleRequestFailure = '[Booking API] Reschedule Failed',
}

/** Dispatched again with the view on screen, it reloads its days. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SetAvailabilityView = createAction(
  BookingActionTypes.SetAvailabilityView,
  props<{ availabilityView: AvailabilityView; }>(),
);

/** Starts the booking or move over: no notice, nothing sent, and loads the first days. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingPageOpen = createAction(
  BookingActionTypes.BookingPageOpen,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingRequest = createAction(
  BookingActionTypes.BookingRequest,
  props<{ bookingRequest: BookingRequestDto; }>(),
);

/** Moves the booking to `startAt` with its token (`requestReschedule`). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleRequest = createAction(
  BookingActionTypes.RescheduleRequest,
  props<{
    bookingId: string;
    manageToken: string;
    startAt: string;
  }>(),
);

/** Replaces this tab's list with the one another tab saved. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SavedConfirmationsAdopt = createAction(
  BookingActionTypes.SavedConfirmationsAdopt,
  props<{ savedConfirmations: BookingConfirmation[]; }>(),
);

/** A cancelled booking leaves this device's list, if it's there; opened links aren't saved. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SavedConfirmationRemove = createAction(
  BookingActionTypes.SavedConfirmationRemove,
  props<{ bookingId: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityRequestSuccess = createAction(
  BookingActionTypes.AvailabilityRequestSuccess,
  props<{ availableDays: AvailableDay[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityRequestFailure = createAction(
  BookingActionTypes.AvailabilityRequestFailure,
);

/** Adds the booking to this device's list, kept until it starts (BR-22), and opens its page (`openBookedPage`). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingRequestSuccess = createAction(
  BookingActionTypes.BookingRequestSuccess,
  props<{ bookingConfirmation: BookingConfirmation; }>(),
);

/** `notice` is null for a failed bot check, which has its own message; `takenStartAt` comes off the open times. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingRequestFailure = createAction(
  BookingActionTypes.BookingRequestFailure,
  props<{ notice: Notice | null; takenStartAt: string | null; }>(),
);

/** Moves the booking in this device's list, if it's there, and goes back to its page (`returnToMovedBooking`). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleRequestSuccess = createAction(
  BookingActionTypes.RescheduleRequestSuccess,
  props<{ managedBooking: ManagedBooking; manageToken: string; }>(),
);

/** `notice` is null for a failed bot check, which has its own message; `takenStartAt` comes off the open times. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleRequestFailure = createAction(
  BookingActionTypes.RescheduleRequestFailure,
  props<{ notice: Notice | null; takenStartAt: string | null; }>(),
);

