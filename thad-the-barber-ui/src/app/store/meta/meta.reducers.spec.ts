import { ActionReducer, INIT, combineReducers } from '@ngrx/store';
import { testSavedConfirmation } from '../../../testing/test-booking';
import { TEST_SHOP } from '../../../testing/test-shop';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { layoutReducer } from '../app.reducer';
import { AppState } from '../app.state';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopReducer } from '../../features/shop/state/shop.reducer';
import { SavedConfirmation } from '../../features/booking/models/saved-confirmation.model';
import * as BookingActions from '../../features/booking/state/booking.actions';
import { bookingReducer } from '../../features/booking/state/booking.reducer';
import { BookingState } from '../../features/booking/state/booking.state';
import { KEEP_CONFIRMATION_MS } from '../../features/booking/utils/saved-confirmation.utils';
import * as HomeActions from '../../features/home/state/home.actions';
import { homeReducer } from '../../features/home/state/home.reducer';
import { RequestStatus } from '../../shared/models/request.models';
import { localStorageSyncReducer } from './meta.reducers';
import { toMonthView } from '../../features/booking/utils/booking-time.utils';

/** Saved at `savedAt` for an appointment a day from now, so only its age decides whether it's kept. */
function savedConfirmationFrom(savedAt: Date): SavedConfirmation {
  const tomorrow: string = new Date(Date.now() + KEEP_CONFIRMATION_MS).toISOString();
  return testSavedConfirmation(savedAt.toISOString(), tomorrow);
}

function seedBooking(savedConfirmation: SavedConfirmation): void {
  localStorage.setItem('ttb-booking', encodeBase64(JSON.stringify({ savedConfirmation })));
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
      "saves only booking's last confirmation, with no name or phone, and nothing from layout",
      (): void => {
        const savedConfirmation: SavedConfirmation = savedConfirmationFrom(new Date());
        const reducer: ActionReducer<AppState> = createSyncedReducer();
        const viewing: AppState = reducer(
          undefined,
          BookingActions.SetAvailabilityView({ view: toMonthView('2026-10') }),
        );
        reducer(viewing, BookingActions.BookingConfirm({ savedConfirmation }));

        expect(saved('ttb-booking')).toEqual({ savedConfirmation });
        expect(localStorage.getItem('ttb-layout')).toBeNull();
      },
    );

    it(
      'restores a booking confirmed within 24 hours, with the rest of the slice intact',
      (): void => {
        const almostExpired: Date = new Date(Date.now() - KEEP_CONFIRMATION_MS + 60_000);
        const savedConfirmation: SavedConfirmation = savedConfirmationFrom(almostExpired);
        seedBooking(savedConfirmation);

        expect(restoredBooking()).toEqual({
          view: null,
          availableDays: [],
          loadStatus: RequestStatus.Idle,
          savedConfirmation,
        });
      },
    );

    it(
      'drops a saved confirmation over 24 hours old on start-up',
      (): void => {
        seedBooking(savedConfirmationFrom(new Date(Date.now() - KEEP_CONFIRMATION_MS - 60_000)));

        expect(restoredBooking()?.savedConfirmation).toBeNull();
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
