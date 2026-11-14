import { createAction, props } from '@ngrx/store';
import { AvailableDay } from '../dtos/available-day.dto';
import { DayRange } from '../models/day-range.model';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { FoundBooking } from '../dtos/found-booking.dto';
import { BookingRequest as BookingRequestDto } from '../dtos/booking-request.dto';
import { ManagedBooking } from '../dtos/managed-booking.dto';
import { Notice } from '../../../shared/models/notice.model';

export enum BookingActionTypes {
  AvailabilityRequest = '[Booking Page] Availability Requested',
  BookingPageOpen = '[Booking Page] Opened',
  BookingRequest = '[Booking Page] Booking Requested',
  RescheduleRequest = '[Booking Page] Reschedule Requested',
  LookupReset = '[Booking Lookup Page] Reset',
  LookupPhoneChange = '[Booking Lookup Page] Phone Change Requested',
  LookupStartRequest = '[Booking Lookup Page] Code Requested',
  LookupVerifyRequest = '[Booking Lookup Page] Code Submitted',
  AvailabilityRequestSuccess = '[Booking API] Availability Loaded',
  AvailabilityRequestFailure = '[Booking API] Availability Load Failed',
  BookingRequestSuccess = '[Booking API] Booking Made',
  BookingRequestFailure = '[Booking API] Booking Failed',
  RescheduleRequestSuccess = '[Booking API] Booking Moved',
  RescheduleRequestFailure = '[Booking API] Reschedule Failed',
  LookupStartRequestSuccess = '[Booking API] Code Sent',
  LookupStartRequestFailure = '[Booking API] Code Send Failed',
  LookupVerifyRequestSuccess = '[Booking API] Bookings Found',
  LookupVerifyRequestFailure = '[Booking API] Bookings Find Failed',
}

/** Dispatched again with the same days, it reloads them. */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const AvailabilityRequest = createAction(
  BookingActionTypes.AvailabilityRequest,
  props<{ dayRange: DayRange; }>(),
);

/**
 * Starts the booking or move over: no notice, nothing sent, and loads the first days: the month of `pickedStartAt`
 * when the page opens with a time already picked (from the home page), else the month of today.
 */
// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingPageOpen = createAction(
  BookingActionTypes.BookingPageOpen,
  props<{ pickedStartAt: string | null; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingRequest = createAction(
  BookingActionTypes.BookingRequest,
  props<{ bookingRequest: BookingRequestDto; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleRequest = createAction(
  BookingActionTypes.RescheduleRequest,
  props<{
    bookingId: string;
    manageToken: string;
    startAt: string;
  }>(),
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

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingRequestSuccess = createAction(
  BookingActionTypes.BookingRequestSuccess,
  props<{ bookingConfirmation: BookingConfirmation; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const BookingRequestFailure = createAction(
  BookingActionTypes.BookingRequestFailure,
  props<{ notice: Notice | null; takenStartAt: string | null; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleRequestSuccess = createAction(
  BookingActionTypes.RescheduleRequestSuccess,
  props<{ managedBooking: ManagedBooking; manageToken: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const RescheduleRequestFailure = createAction(
  BookingActionTypes.RescheduleRequestFailure,
  props<{ notice: Notice | null; takenStartAt: string | null; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const LookupReset = createAction(
  BookingActionTypes.LookupReset,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const LookupPhoneChange = createAction(
  BookingActionTypes.LookupPhoneChange,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const LookupStartRequest = createAction(
  BookingActionTypes.LookupStartRequest,
  props<{ phone: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const LookupVerifyRequest = createAction(
  BookingActionTypes.LookupVerifyRequest,
  props<{ phone: string; code: string; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const LookupStartRequestSuccess = createAction(
  BookingActionTypes.LookupStartRequestSuccess,
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const LookupStartRequestFailure = createAction(
  BookingActionTypes.LookupStartRequestFailure,
  props<{ notice: Notice; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const LookupVerifyRequestSuccess = createAction(
  BookingActionTypes.LookupVerifyRequestSuccess,
  props<{ foundBookings: FoundBooking[]; }>(),
);

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
export const LookupVerifyRequestFailure = createAction(
  BookingActionTypes.LookupVerifyRequestFailure,
  props<{ notice: Notice; }>(),
);
