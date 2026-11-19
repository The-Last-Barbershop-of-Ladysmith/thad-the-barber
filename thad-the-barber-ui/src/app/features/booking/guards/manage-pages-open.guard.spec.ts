import { TestBed } from '@angular/core/testing';
import { IS_BOOKING_PREVIEW } from '../../../core/config/booking-preview.token';
import { managePagesOpenGuard } from './manage-pages-open.guard';

describe(
  'managePagesOpenGuard',
  (): void => {
    function matches(isBookingPreview: boolean): boolean {
      TestBed.configureTestingModule({ providers: [{ provide: IS_BOOKING_PREVIEW, useValue: isBookingPreview }] });
      return TestBed.runInInjectionContext(managePagesOpenGuard);
    }

    it(
      'lets the manage routes match once booking is open',
      (): void => {
        expect(matches(false)).toBe(true);
      },
    );

    it(
      'keeps the manage routes from matching while booking is a preview',
      (): void => {
        expect(matches(true)).toBe(false);
      },
    );
  },
);
