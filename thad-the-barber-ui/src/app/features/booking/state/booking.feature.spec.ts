import { RequestStatus } from '../../../shared/models/request.models';
import { AVAILABILITY_FAILED_NOTICE, NO_OPEN_DAYS_NOTICE } from '../config/booking-notices';
import { bookingFeature } from './booking.feature';
import { BookingState, initialBookingState } from './booking.state';

describe(
  'booking feature',
  (): void => {
    it(
      'shows the failed notice, with a retry, when the month failed to load, and the empty one when it has no open days',
      (): void => {
        const failed: BookingState = { ...initialBookingState, loadStatus: RequestStatus.Error };
        const empty: BookingState = { ...initialBookingState, loadStatus: RequestStatus.Success };
        const open: BookingState = {
          ...empty,
          availableDays: [{ date: '2026-11-02', times: ['2026-11-02T20:00:00Z'] }],
        };

        expect(bookingFeature.selectNotice({ booking: failed })).toEqual(AVAILABILITY_FAILED_NOTICE);
        expect(bookingFeature.selectNotice({ booking: empty })).toEqual(NO_OPEN_DAYS_NOTICE);
        expect(bookingFeature.selectNotice({ booking: open })).toBeNull();
        expect(bookingFeature.selectNotice({ booking: initialBookingState })).toBeNull();
      },
    );

    it(
      'counts the open times of each open day',
      (): void => {
        const booking: BookingState = {
          ...initialBookingState,
          availableDays: [
            { date: '2026-11-02', times: ['2026-11-02T20:00:00Z', '2026-11-02T20:30:00Z'] },
            { date: '2026-11-03', times: ['2026-11-03T20:00:00Z'] },
          ],
        };

        expect(bookingFeature.selectOpenTimeCounts({ booking })).toEqual(new Map([
          ['2026-11-02', 2],
          ['2026-11-03', 1],
        ]));
      },
    );

    it(
      'is looking up only while a lookup request is sent',
      (): void => {
        const sending: BookingState = { ...initialBookingState, lookupStatus: RequestStatus.Pending };
        const failed: BookingState = { ...initialBookingState, lookupStatus: RequestStatus.Error };

        expect(bookingFeature.selectIsLookingUp({ booking: sending })).toBe(true);
        expect(bookingFeature.selectIsLookingUp({ booking: failed })).toBe(false);
        expect(bookingFeature.selectIsLookingUp({ booking: initialBookingState })).toBe(false);
      },
    );
  },
);
