import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingComingSoon } from './booking-coming-soon';

describe(
  'BookingComingSoon',
  (): void => {
    let element: HTMLElement;

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [provideRouter([]), provideStore({ [shopFeature.name]: shopFeature.reducer })],
      });
      TestBed.inject(Store).dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      const fixture: ComponentFixture<BookingComingSoon> = TestBed.createComponent(BookingComingSoon);
      fixture.detectChanges();
      element = fixture.nativeElement as HTMLElement;
    });

    it(
      "says booking isn't open and gives the shop's phone and text to book in the meantime",
      (): void => {
        expect(element.querySelector('[data-testid="booking-coming-soon-notice"]')).not.toBeNull();
        expect(element.querySelector('[data-testid="coming-soon-call"]')?.getAttribute('href'))
          .toBe(`tel:${TEST_SHOP.phone}`);
        expect(element.querySelector('[data-testid="coming-soon-text"]')?.getAttribute('href'))
          .toMatch(/^sms:/);
      },
    );

    it(
      'shows the details and both consent boxes, switched off, with the book button off',
      (): void => {
        const inputs: HTMLInputElement[] = Array.from(
          element.querySelectorAll<HTMLInputElement>('#booking-name, #booking-phone, #booking-text-consent, #booking-marketing-consent'),
        );

        expect(inputs).toHaveLength(4);
        expect(inputs.every((input: HTMLInputElement): boolean => input.disabled)).toBe(true);
        expect(element.querySelector<HTMLButtonElement>('[data-testid="coming-soon-book"]')?.disabled).toBe(true);
      },
    );

    it(
      'links the terms and the privacy policy from the consent wording',
      (): void => {
        expect(element.querySelector('[data-testid="details-terms"]')?.getAttribute('href')).toBe('/terms');
        expect(element.querySelector('[data-testid="details-privacy"]')?.getAttribute('href')).toBe('/privacy');
      },
    );
  },
);
