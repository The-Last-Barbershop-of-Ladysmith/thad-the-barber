import { BookingRequest, TimeSlot } from '../models/booking.models';
import { BookingApiActions, BookingPageActions } from './booking.actions';
import { bookingReducer } from './booking.reducer';
import { BookingState, initialBookingState } from './booking.state';

const slots: TimeSlot[] = [
  {
    time: '10:00',
    label: '10:00 AM',
    available: false,
  },
  {
    time: '10:30',
    label: '10:30 AM',
    available: true,
  },
  {
    time: '11:00',
    label: '11:00 AM',
    available: true,
  },
];

describe(
  'booking reducer',
  (): void => {
    it(
      'clears the time and loads slots when a new date is picked',
      (): void => {
        const before: BookingState = {
          ...initialBookingState,
          selectedDate: '2026-10-03',
          selectedTime: '10:30',
          slots,
        };
        const state: BookingState = bookingReducer(before, BookingPageActions.dateSelected({ date: '2026-10-04' }));

        expect(state.selectedDate).toBe('2026-10-04');
        expect(state.selectedTime).toBeNull();
        expect(state.slots).toEqual([]);
        expect(state.slotsLoading).toBe(true);
      },
    );

    it(
      'ignores slots that arrive for a date no longer selected',
      (): void => {
        const before: BookingState = {
          ...initialBookingState,
          selectedDate: '2026-10-04',
          slotsLoading: true,
        };
        const state: BookingState = bookingReducer(before, BookingApiActions.slotsLoaded({ date: '2026-10-03', slots }));

        expect(state.slots).toEqual([]);
        expect(state.slotsLoading).toBe(true);
      },
    );

    it(
      'ignores availability for a month no longer in view',
      (): void => {
        const before: BookingState = { ...initialBookingState, visibleMonth: '2026-11' };
        const state: BookingState = bookingReducer(
          before,
          BookingApiActions.monthAvailabilityLoaded({ month: '2026-10', unavailableDates: ['2026-10-01'] }),
        );

        expect(state.unavailableDates).toEqual([]);
      },
    );

    it(
      'moves through submitting to booked',
      (): void => {
        const request: BookingRequest = {
          date: '2026-10-03',
          time: '10:30',
          name: 'Test',
          phone: '(540) 555-1234',
        };
        let state: BookingState = bookingReducer(initialBookingState, BookingPageActions.confirmRequested({ request }));
        expect(state.status).toBe('submitting');

        state = bookingReducer(state, BookingApiActions.bookingConfirmed({ confirmation: { ...request, id: 'abc' } }));
        expect(state.status).toBe('booked');
        expect(state.confirmation?.id).toBe('abc');
      },
    );

    it(
      'resets a finished booking when details change',
      (): void => {
        const booked: BookingState = {
          ...initialBookingState,
          status: 'booked',
          confirmation: null,
        };
        expect(bookingReducer(booked, BookingPageActions.detailsEdited()).status).toBe('idle');
      },
    );
  },
);
