import { createAction, props } from '@ngrx/store';
import { AvailableDay } from '../dtos/available-day.dto';
import { AvailabilityView } from '../models/availability-view.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { BookingRequest as BookingRequestDto } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { Notice } from '../../../shared/models/notice.model';

export enum BookingActionTypes {
  SetAvailabilityView = '[Booking Page] Set Availability View',
  UpcomingDaysOpen = '[Booking Page] Upcoming Days Opened',
  AvailabilityReload = '[Booking Page] Availability Reloaded',
  BookingPageOpen = '[Booking Page] Opened',
  BookingDraftChange = '[Booking Page] Draft Changed',
  BookingRequest = '[Booking Page] Booking Requested',
  RescheduleRequest = '[Booking Page] Reschedule Requested',
  SavedConfirmationsAdopt = '[Booking Tabs] Saved Confirmations Adopted',
  SavedConfirmationRemove = '[Manage Booking Page] Saved Confirmation Removed',
  AvailabilityRequestSuccess = '[Booking API] Availability Loaded',
  AvailabilityRequestFailure = '[Booking API] Availability Load Failed',
  BookingRequestSuccess = '[Booking API] Booking Made',
  BookingRequestFailure = '[Booking API] Booking Failed',
  BookingTimeTaken = '[Booking API] Booking Time Taken',
  BookingShownHere = '[Booking API] Booking Shown Here',
  RescheduleRequestSuccess = '[Booking API] Booking Moved',
  RescheduleRequestFailure = '[Booking API] Reschedule Failed',
  RescheduleReturn = '[Booking API] Reschedule Returned To Booking',
}

/** Opens the next 31 days once the shop is known, on its clock (`openUpcomingDays`). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const UpcomingDaysOpen = createAction(
  BookingActionTypes.UpcomingDaysOpen,
);

/** Asks again for the days in view (`reloadAvailability`); before the first load there's nothing to reload. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityReload = createAction(
  BookingActionTypes.AvailabilityReload,
);

/** Dispatched again for the same view, it reloads it. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const SetAvailabilityView = createAction(
  BookingActionTypes.SetAvailabilityView,
  props<{ availabilityView: AvailabilityView; }>(),
);

/** Starts the booking or move over: no notice, no retry key, nothing sent. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingPageOpen = createAction(
  BookingActionTypes.BookingPageOpen,
);

/**
 * Any field changed, so the next confirm is a new booking with a new key. The page keeps the notice when it drops a
 * pick itself (a taken time, a day left without times), since the notice says why.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingDraftChange = createAction(
  BookingActionTypes.BookingDraftChange,
  props<{ isNoticeKept: boolean; }>(),
);

/** Sends the booking (`requestBooking`); a retry of the same attempt resends its `idempotencyKey`. */
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
    bookingId: string; manageToken: string; startAt: string;
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
  props<{ availabilityView: AvailabilityView; availableDays: AvailableDay[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityRequestFailure = createAction(
  BookingActionTypes.AvailabilityRequestFailure,
  props<{ availabilityView: AvailabilityView; }>(),
);

/** Adds the booking to this device's list, kept until it starts (BR-22), and opens its page (`openBookedPage`). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingRequestSuccess = createAction(
  BookingActionTypes.BookingRequestSuccess,
  props<{ bookingConfirmation: BookingConfirmation; }>(),
);

/** `notice` is null for a failed bot check, which has its own message. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingRequestFailure = createAction(
  BookingActionTypes.BookingRequestFailure,
  props<{ notice: Notice | null; }>(),
);

/** The picked time was taken meanwhile: the page drops it and opens the time step, before the failure's notice. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingTimeTaken = createAction(
  BookingActionTypes.BookingTimeTaken,
);

/** The booking's own page didn't open, so the booking page confirms it and starts over for another. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingShownHere = createAction(
  BookingActionTypes.BookingShownHere,
  props<{ bookingId: string; }>(),
);

/** Moves the booking in this device's list, if it's there, and goes back to its page (`returnToMovedBooking`). */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleRequestSuccess = createAction(
  BookingActionTypes.RescheduleRequestSuccess,
  props<{ managedBooking: ManagedBooking; manageToken: string; }>(),
);

/** `notice` is null for a failed bot check, which has its own message. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleRequestFailure = createAction(
  BookingActionTypes.RescheduleRequestFailure,
  props<{ notice: Notice | null; }>(),
);

/** The booking started, was cancelled or is gone meanwhile: back to its page, which shows why. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleReturn = createAction(
  BookingActionTypes.RescheduleReturn,
  props<{ bookingId: string; manageToken: string; }>(),
);
