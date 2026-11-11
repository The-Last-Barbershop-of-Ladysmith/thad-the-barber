import { ActionReducer, INIT, combineReducers } from '@ngrx/store';
import { TEST_SHOP } from '../../../testing/test-shop';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { layoutReducer } from '../app.reducer';
import { AppState } from '../app.state';
import * as ShopActions from '../../features/shop/state/shop.actions';
import { shopReducer } from '../../features/shop/state/shop.reducer';
import * as HomeActions from '../../features/home/state/home.actions';
import { homeReducer } from '../../features/home/state/home.reducer';
import { RequestStatus } from '../../shared/models/request.models';
import { localStorageSyncReducer } from './meta.reducers';

/** The library reads storage when the meta-reducer is created, so build it after seeding. */
function createSyncedReducer(): ActionReducer<AppState> {
  return localStorageSyncReducer(combineReducers({
    layout: layoutReducer,
    home: homeReducer,
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
      "saves only home's SMS signup, so an old load status never hides a nav link on another page",
      (): void => {
        const reducer: ActionReducer<AppState> = createSyncedReducer();
        const failedContent: AppState = reducer(
          undefined,
          HomeActions.HomeContentRequestFailure({ error: 'Could not load the reviews.' }),
        );
        reducer(failedContent, HomeActions.SmsSignupRequestSuccess({ phone: '(555) 010-0199' }));

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
      'saves the shop without its load status, so the next visit refreshes it, and nothing from layout',
      (): void => {
        createSyncedReducer()(undefined, ShopActions.ShopInfoRequestSuccess({ shopInfo: TEST_SHOP }));

        expect(saved('ttb-shop')).toEqual({ shopInfo: TEST_SHOP });
        expect(localStorage.getItem('ttb-layout')).toBeNull();
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
