import { inject } from '@angular/core';
import { IS_BOOKING_PREVIEW } from '../../../core/config/booking-preview.token';

/** No bookings to manage in a preview, so these routes don't match and the visitor gets the not-found page. */
export const managePagesOpenGuard: () => boolean = (): boolean => !inject(IS_BOOKING_PREVIEW);
