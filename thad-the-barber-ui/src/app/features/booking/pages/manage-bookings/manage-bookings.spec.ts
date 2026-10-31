import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterLink, provideRouter } from '@angular/router';
import { Store, provideStore } from '@ngrx/store';
import { testConfirmation } from '../../../../../testing/test-booking';
import { TEST_SHOP } from '../../../../../testing/test-shop';
import { AppState } from '../../../../store/app.state';
import * as ShopActions from '../../../shop/state/shop.actions';
import { shopFeature } from '../../../shop/state/shop.feature';
import { BookingConfirmation } from '../../dtos/booking-confirmation.dto';
import * as BookingActions from '../../state/booking.actions';
import { bookingFeature } from '../../state/booking.feature';
import { ManageBookings } from './manage-bookings';

const ONE_DAY_MS: number = 24 * 60 * 60 * 1000;

function bookingIn(days: number, id: string): BookingConfirmation {
  return testConfirmation(new Date(Date.now() + days * ONE_DAY_MS).toISOString(), id);
}

describe(
  'ManageBookings',
  (): void => {
    let fixture: ComponentFixture<ManageBookings>;
    let store: Store<AppState>;

    beforeEach((): void => {
      TestBed.configureTestingModule({
        providers: [
          provideStore({
            [shopFeature.name]: shopFeature.reducer,
            [bookingFeature.name]: bookingFeature.reducer,
          }),
          provideRouter([]),
        ],
      });
      // The links work; the PrimeNG parts and the backdrop are left out.
      TestBed.overrideComponent(
        ManageBookings,
        { set: { imports: [RouterLink], schemas: [NO_ERRORS_SCHEMA] } },
      );
      store = TestBed.inject<Store<AppState>>(Store);
    });

    function openPage(savedConfirmations: BookingConfirmation[], isShopLoaded: boolean = true): void {
      if (isShopLoaded) {
        store.dispatch(ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));
      }
      store.dispatch(BookingActions.SavedConfirmationsAdopt({ savedConfirmations }));
      fixture = TestBed.createComponent(ManageBookings);
      fixture.detectChanges();
    }

    function savedBookingLinks(): string[] {
      return [...(fixture.nativeElement as HTMLElement).querySelectorAll('[data-testid="saved-booking"]')]
        .map((link: Element): string => link.getAttribute('href') ?? '');
    }

    function byTestId(testId: string): HTMLElement | null {
      return (fixture.nativeElement as HTMLElement).querySelector(`[data-testid="${testId}"]`);
    }

    it(
      "lists this device's upcoming bookings soonest first, each opening its manage page",
      (): void => {
        openPage([
          bookingIn(7, 'made-up-next-week'),
          bookingIn(-1, 'made-up-yesterday'),
          bookingIn(1, 'made-up-tomorrow'),
        ]);

        expect(savedBookingLinks()).toEqual(['/book/manage/made-up-tomorrow', '/book/manage/made-up-next-week']);
        expect(byTestId('no-saved-bookings')).toBeNull();
      },
    );

    it(
      'says there are none and offers to book when none is upcoming',
      (): void => {
        openPage([bookingIn(-1, 'made-up-yesterday')]);

        expect(savedBookingLinks()).toEqual([]);
        expect(byTestId('no-saved-bookings')).not.toBeNull();
      },
    );

    it(
      "waits for the shop before listing, since times show on the shop's clock",
      (): void => {
        openPage([bookingIn(1, 'made-up-tomorrow')], false);

        expect(byTestId('saved-bookings')).toBeNull();
        expect(byTestId('no-saved-bookings')).toBeNull();
      },
    );

    it(
      "links to Square's booking site for bookings made elsewhere",
      (): void => {
        openPage([]);

        expect(byTestId('all-bookings-on-square')?.getAttribute('href')).toBe(TEST_SHOP.squareBookingSiteUrl);
      },
    );
  },
);
