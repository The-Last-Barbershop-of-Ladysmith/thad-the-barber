import {
  Action,
  ActionReducer,
  INIT,
  UPDATE,
  combineReducers,
  createAction,
  createReducer,
  on,
  props,
} from '@ngrx/store';
import { TEST_SHOP } from '../../../testing/test-shop';
import { decodeBase64, encodeBase64 } from '../../shared/utils/base64.utils';
import { layoutReducer } from '../app.reducer';
import { AppState } from '../app.state';
import * as ShopActions from '../shop/shop.actions';
import { shopReducer } from '../shop/shop.reducer';
import * as HomeActions from '../../features/home/state/home.actions';
import { homeReducer } from '../../features/home/state/home.reducer';
import { RequestStatus } from '../../shared/models/request.models';
import { localStorageSyncReducer } from './meta.reducers';

/** Stand-in for a synced feature slice, so this spec tests only the sync, not a real feature reducer. */
interface FakeSlice { note: string; }

const initialFakeSlice: FakeSlice = { note: '' };

// eslint-disable-next-line @typescript-eslint/typedef -- NgRx does not export the ActionCreator type.
const noteSet = createAction('[Test] Note Set', props<FakeSlice>());

const fakeSliceReducer: ActionReducer<FakeSlice> = createReducer(
  initialFakeSlice,
  on(noteSet, (_state: FakeSlice, { note }: FakeSlice): FakeSlice => ({ note })),
);

/** The library reads storage when the meta-reducer is created, so build it after seeding. */
function createSyncedReducer(): ActionReducer<AppState> {
  return localStorageSyncReducer(combineReducers({
    layout: layoutReducer,
    home: homeReducer,
    booking: fakeSliceReducer,
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
      'saves booking base64-encoded under ttb-<key>, but not layout',
      (): void => {
        createSyncedReducer()(undefined, noteSet({ note: 'didn’t — works' }));

        expect(saved('ttb-booking')).toEqual({ note: 'didn’t — works' });
        expect(localStorage.getItem('ttb-layout')).toBeNull();
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
      'restores a saved slice when it registers',
      (): void => {
        localStorage.setItem('ttb-booking', encodeBase64(JSON.stringify({ note: 'restored' })));
        const reducer: ActionReducer<AppState> = createSyncedReducer();
        const init: AppState = reducer(undefined, { type: INIT });
        const update: Action & { features: string[]; } = { type: UPDATE, features: ['booking'] };

        expect((reducer(init, update) as unknown as Record<string, unknown>)['booking']).toEqual({ note: 'restored' });
      },
    );
  },
);
