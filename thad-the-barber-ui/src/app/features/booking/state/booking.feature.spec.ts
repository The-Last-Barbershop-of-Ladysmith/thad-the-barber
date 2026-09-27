import { type TimeSlot } from '../models/booking.models';
import { selectOpenSlotCount, selectSelectedSlot } from './booking.feature';
import { type BookingState, initialBookingState } from './booking.state';

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
  'booking feature',
  (): void => {
    it(
      'derives the open count and the selected slot from the scoped feature state',
      (): void => {
        const root: { booking: BookingState; } = {
          booking: {
            ...initialBookingState,
            slots,
            selectedTime: '11:00',
          },
        };
        expect(selectOpenSlotCount(root)).toBe(2);
        expect(selectSelectedSlot(root)?.label).toBe('11:00 AM');
      },
    );
  },
);
