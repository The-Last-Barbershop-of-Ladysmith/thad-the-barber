import { type BookingConfirmation, type TimeSlot } from '../models/booking.models';

export type BookingStatus = 'idle' | 'submitting' | 'booked' | 'error';

/** Dates are ISO strings ("2026-10-03") so the state stays serializable. */
export interface BookingState {
  visibleMonth: string | null;
  unavailableDates: string[];
  selectedDate: string | null;
  slots: TimeSlot[];
  slotsLoading: boolean;
  selectedTime: string | null;
  status: BookingStatus;
  confirmation: BookingConfirmation | null;
  error: string | null;
}

export const initialBookingState: BookingState = {
  visibleMonth: null,
  unavailableDates: [],
  selectedDate: null,
  slots: [],
  slotsLoading: false,
  selectedTime: null,
  status: 'idle',
  confirmation: null,
  error: null,
};
