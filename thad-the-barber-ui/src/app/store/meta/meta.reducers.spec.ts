import { ActionReducer, INIT, combineReducers } from '@ngrx/store';
import { encodeSavedBookings, testConfirmationIn } from '../../../testing/test-booking';
import { TEST_SHOP } from '../../../testing/test-shop';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { layoutReducer } from '../app.reducer';
import { AppState } from '../app.state';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopReducer } from '../../features/shop/state/shop.reducer';
import { BookingConfirmation } from '../../features/booking/dtos/booking-confirmation.dto';
import * as BookingActions from '../../features/booking/state/booking.actions';
import { bookingReducer } from '../../features/booking/state/booking.reducer';
import { BookingState } from '../../features/booking/state/booking.state';
import * as HomeActions from '../../features/home/state/home.actions';
import { homeReducer } from '../../features/home/state/home.reducer';
import { RequestStatus } from '../../shared/models/request.models';
import { localStorageSyncReducer } from './meta.reducers';
import { toMonthView } from '../../features/booking/utils/booking-time.utils';

function seedBookings(savedConfirmations: BookingConfirmation[]): void {
  localStorage.setItem('ttb-booking', encodeSavedBookings(savedConfirmations));
}

function restoredBooking(): BookingState | undefined {
  const init: AppState = createSyncedReducer()(undefined, { type: INIT });
  return (init as unknown as { booking?: BookingState; }).booking;
}

/** The library reads storage when the meta-reducer is created, so build it after seeding. */
function createSyncedReducer(): ActionReducer<AppState> {
  return localStorageSyncReducer(combineReducers({
    layout: layoutReducer,
    home: homeReducer,
    booking: bookingReducer,
    shop: shopReducer,
  }) as unknown as ActionReducer<AppState>);
}

function saved(key: string): unknown {
  const encoded: string | null = localStorage.getItem(key);
  return encoded ? JSON.parse(decodeBase64(encoded)) : null;
}

describe(
  'localStorageSyncReducer',
  (): void => {
    beforeEach((): void => {
      localStorage.clear();
    });

    it(
      "saves only booking's confirmations, with no name or phone, and nothing from layout",
      (): void => {
        const bookingConfirmation: BookingConfirmation = testConfirmationIn(1, 'made-up-tomorrow');
        const reducer: ActionReducer<AppState> = createSyncedReducer();
        const viewing: AppState = reducer(
          undefined,
          BookingActions.SetAvailabilityView({ availabilityView: toMonthView('2026-10') }),
        );
        reducer(viewing, BookingActions.BookingConfirm({ bookingConfirmation }));

        expect(saved('ttb-booking')).toEqual({ savedConfirmations: [bookingConfirmation] });
        expect(localStorage.getItem('ttb-layout')).toBeNull();
      },
    );

    it(
      'restores the upcoming bookings, however long ago they were made, with the rest of the slice intact',
      (): void => {
        const tomorrow: BookingConfirmation = testConfirmationIn(1, 'made-up-tomorrow');
        const nextMonth: BookingConfirmation = testConfirmationIn(30, 'made-up-next-month');
        seedBookings([nextMonth, tomorrow]);

        expect(restoredBooking()).toEqual({
          availabilityView: null,
          availableDays: [],
          loadStatus: RequestStatus.Idle,
          savedConfirmations: [tomorrow, nextMonth],
        });
      },
    );

    it(
      'drops the bookings that have started on start-up',
      (): void => {
        const tomorrow: BookingConfirmation = testConfirmationIn(1, 'made-up-tomorrow');
        seedBookings([testConfirmationIn(-1, 'made-up-yesterday'), tomorrow]);

        expect(restoredBooking()?.savedConfirmations).toEqual([tomorrow]);
      },
    );

    it(
      "saves only home's SMS signup, so an old load status never hides a nav link on another page",
      (): void => {
        const reducer: ActionReducer<AppState> = createSyncedReducer();
        const failedGallery: AppState = reducer(undefined, HomeActions.GalleryRequestFailure());
        reducer(failedGallery, HomeActions.SmsSignupRequestSuccess({ phone: '(555) 010-0199' }));

        expect(saved('ttb-home')).toEqual({
          smsSignup: {
            status: RequestStatus.Success,
            phone: '(555) 010-0199',
            error: null,
          },
        });
      },
    );

    it(
      'saves the shop without its load status, so the next visit refreshes it',
      (): void => {
        createSyncedReducer()(undefined, ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        expect(saved('ttb-shop')).toEqual({ shopInfo: TEST_SHOP });
      },
    );

    it(
      'restores a saved slice at start-up',
      (): void => {
        localStorage.setItem('ttb-shop', encodeBase64(JSON.stringify({ shopInfo: TEST_SHOP })));
        const reducer: ActionReducer<AppState> = createSyncedReducer();
        const init: AppState = reducer(undefined, { type: INIT });

        expect((init as unknown as Record<string, { shopInfo: unknown; }>)['shop']?.shopInfo).toEqual(TEST_SHOP);
      },
    );
  },
);
