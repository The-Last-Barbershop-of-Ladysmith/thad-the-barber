import { RequestStatus } from '../../../shared/models/request.models';
import { testConfirmationIn } from '../../../../testing/test-booking';
import { BookingConfirmation } from '../dtos/booking-confirmation.dto';
import { AVAILABILITY_FAILED_NOTICE, UPCOMING_BOOKING_NOTICE } from '../utils/booking-notice.utils';
import { bookingFeature } from './booking.feature';
import { BookingState, initialBookingState } from './booking.state';

describe(
  'booking feature',
  (): void => {
    it(
      'shows the availability notice, with a retry, only when the month failed to load',
      (): void => {
        const failed: BookingState = { ...initialBookingState, loadStatus: RequestStatus.Error };

        expect(bookingFeature.selectNotice({ booking: failed })).toEqual(AVAILABILITY_FAILED_NOTICE);
        expect(bookingFeature.selectNotice({ booking: initialBookingState })).toBeNull();
      },
    );

    it(
      'lists the upcoming bookings in the order the slice keeps them, with the notice that there is one',
      (): void => {
        const tomorrow: BookingConfirmation = testConfirmationIn(1, 'made-up-tomorrow');
        const nextWeek: BookingConfirmation = testConfirmationIn(7, 'made-up-next-week');
        const booking: BookingState = {
          ...initialBookingState,
          savedConfirmations: [
            testConfirmationIn(-1, 'made-up-yesterday'),
            tomorrow,
            nextWeek,
          ],
        };

        expect(bookingFeature.selectUpcomingConfirmations({ booking })).toEqual([tomorrow, nextWeek]);
        expect(bookingFeature.selectUpcomingBookingNotice({ booking })).toEqual(UPCOMING_BOOKING_NOTICE);
      },
    );

    it(
      'has no notice when every saved booking has started',
      (): void => {
        const booking: BookingState = {
          ...initialBookingState,
          savedConfirmations: [testConfirmationIn(-1, 'made-up-yesterday')],
        };

        expect(bookingFeature.selectUpcomingConfirmations({ booking })).toEqual([]);
        expect(bookingFeature.selectUpcomingBookingNotice({ booking })).toBeNull();
      },
    );
  },
);
