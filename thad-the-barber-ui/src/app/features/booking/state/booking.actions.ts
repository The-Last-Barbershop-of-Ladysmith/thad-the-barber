import {
  createActionGroup,
  emptyProps,
  props,
} from '@ngrx/store';
import {
  BookingConfirmation,
  BookingRequest,
  TimeSlot,
} from '../models/booking.models';

/** month: "2026-10" */
export interface MonthPayload { month: string; }
/** date: "2026-10-03" */
export interface DatePayload { date: string; }
/** time: "14:30" */
export interface TimePayload { time: string; }
export interface ConfirmRequestPayload { request: BookingRequest; }
export interface MonthAvailabilityPayload {
  month: string;
  unavailableDates: string[];
}
export interface SlotsPayload {
  date: string;
  slots: TimeSlot[];
}
export interface ConfirmationPayload { confirmation: BookingConfirmation; }
export interface ErrorPayload { error: string; }

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionGroup type.
export const BookingPageActions = createActionGroup({
  source: 'Booking Page',
  events: {
    /** Clears the slice back to its initial state (also overwrites its saved copy). */
    'State Reset': emptyProps(),
    'Month Viewed': props<MonthPayload>(),
    'Date Selected': props<DatePayload>(),
    'Time Selected': props<TimePayload>(),
    'Details Edited': emptyProps(),
    'Confirm Requested': props<ConfirmRequestPayload>(),
  },
});

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionGroup type.
export const BookingApiActions = createActionGroup({
  source: 'Booking API',
  events: {
    'Month Availability Loaded': props<MonthAvailabilityPayload>(),
    'Slots Loaded': props<SlotsPayload>(),
    'Slots Load Failed': props<ErrorPayload>(),
    'Booking Confirmed': props<ConfirmationPayload>(),
    'Booking Failed': props<ErrorPayload>(),
  },
});
