import { RequestStatus } from '../../../shared/models/request.models';
import { AVAILABILITY_FAILED_NOTICE } from '../utils/booking-notice.utils';
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
  },
);
