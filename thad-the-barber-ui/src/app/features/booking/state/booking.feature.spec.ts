import { RequestStatus } from '../../../shared/models/request.models';
import { toIsoDate } from '../../../shared/utils/date.utils';
import { AVAILABILITY_FAILED_NOTICE } from '../utils/booking-notice.utils';
import { bookingFeature } from './booking.feature';
import { BookingState, initialBookingState } from './booking.state';

describe(
  'booking feature',
  (): void => {
    it(
      'disables every day of the visible month without open times',
      (): void => {
        const february: BookingState = {
          visibleMonth: '2026-02',
          availableDays: [
            { date: '2026-02-01', times: ['2026-02-01T20:00:00Z'] },
            { date: '2026-02-28', times: ['2026-02-28T20:00:00Z'] },
          ],
          loadStatus: RequestStatus.Success,
        };

        const disabled: string[] = bookingFeature.selectDisabledDates({ booking: february })
          .map((date: Date): string => toIsoDate(date));

        expect(disabled).toHaveLength(26);
        expect(disabled[0]).toBe('2026-02-02');
        expect(disabled.at(-1)).toBe('2026-02-27');
      },
    );

    it(
      'shows the availability notice, with a retry, only when the month failed to load',
      (): void => {
        const failed: BookingState = { ...initialBookingState, loadStatus: RequestStatus.Error };

        expect(bookingFeature.selectNotice({ booking: failed })).toEqual(AVAILABILITY_FAILED_NOTICE);
        expect(bookingFeature.selectNotice({ booking: initialBookingState })).toBeNull();
      },
    );

    it(
      'disables nothing before a month is viewed',
      (): void => {
        expect(bookingFeature.selectDisabledDates({ booking: initialBookingState })).toEqual([]);
      },
    );
  },
);
