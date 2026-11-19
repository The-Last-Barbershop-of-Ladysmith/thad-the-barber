import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * True while the booking form works but takes no bookings yet (prod before online booking opens). It is a token, not a
 * direct read of the environment, so a test can turn it on or off.
 */
export const IS_BOOKING_PREVIEW: InjectionToken<boolean> = new InjectionToken<boolean>(
  'IS_BOOKING_PREVIEW',
  {
    providedIn: 'root',
    factory: (): boolean => environment.isBookingPreview,
  },
);
