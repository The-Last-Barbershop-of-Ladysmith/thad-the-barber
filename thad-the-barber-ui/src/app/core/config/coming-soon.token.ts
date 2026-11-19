import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * True while the site shows what it will offer but takes no bookings or sign-ups yet (prod before launch). It is a
 * token, not a direct read of the environment, so a test can turn it on or off.
 */
export const IS_COMING_SOON: InjectionToken<boolean> = new InjectionToken<boolean>(
  'IS_COMING_SOON',
  {
    providedIn: 'root',
    factory: (): boolean => environment.isComingSoon,
  },
);
